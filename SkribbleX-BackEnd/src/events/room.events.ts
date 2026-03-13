// src/socket/room.events.ts
import type { Server, Socket } from "socket.io";
import * as roomService from "../services/room.service";
import { LogHelper } from "../utils/LogHelper";

const ROUND_END_DELAY_MS = 5_000;

// ─── Socket→Room Mapping ──────────────────────────────────────────────────────
// Hält fest in welchem Raum jeder Socket gerade ist.
// Nötig weil socket.rooms beim disconnect-Event bereits geleert ist.
const socketRoomMap = new Map<string, string>(); // socketId → roomID

export function registerRoomEvents(io: Server, socket: Socket) {
  // ─── room:create ────────────────────────────────────────────────────────────
  socket.on("room:create", (_, callback) => {
    try {
      const roomID = roomService.createRoom();
      callback?.({ ok: true, roomID });
    } catch (err: any) {
      LogHelper.logInfo("room:create", err?.message ?? String(err));
      callback?.({ ok: false, error: err?.message ?? "Unknown error" });
    }
  });

  // ─── room:join ──────────────────────────────────────────────────────────────
  // payload: { roomID, playerID, name }
  socket.on("room:join", ({ roomID, playerID, name }, callback) => {
    try {
      const room = roomService.joinRoom({
        roomID,
        socketId: socket.id,
        playerID,
        name,
      });

      socket.join(roomID);
      socketRoomMap.set(socket.id, roomID); // ← Mapping eintragen

      callback?.({ ok: true, room: roomService.getRoomPublic(room) });

      socket.to(roomID).emit("room:player-joined", {
        player: room.players[socket.id],
        room: roomService.getRoomPublic(room),
      });
    } catch (err: any) {
      callback?.({ ok: false, error: err?.message ?? "Unknown error" });
    }
  });

  // ─── room:leave ─────────────────────────────────────────────────────────────
  socket.on("room:leave", ({ roomID }) => {
    socketRoomMap.delete(socket.id); // ← Mapping entfernen
    handleLeave(io, socket, roomID);
  });

  // ─── lobby:settings ─────────────────────────────────────────────────────────
  // Host ändert Sprache, Kategorien oder Rundenanzahl
  // payload: { roomID, language?, categories?, maxRounds? }
  socket.on(
    "lobby:settings",
    ({ roomID, language, categories, maxRounds }, callback) => {
      try {
        const room = roomService.updateSettings({
          roomID,
          socketId: socket.id,
          language,
          categories,
          maxRounds,
        });

        // Allen im Raum die neuen Settings broadcasten
        io.to(roomID).emit("lobby:settings-updated", {
          room: roomService.getRoomPublic(room),
        });

        callback?.({ ok: true });
      } catch (err: any) {
        callback?.({ ok: false, error: err?.message ?? "Unknown error" });
      }
    },
  );

  // ─── disconnect ─────────────────────────────────────────────────────────────
  // socket.rooms ist hier bereits leer – deshalb socketRoomMap nutzen
  socket.on("disconnect", () => {
    const roomID = socketRoomMap.get(socket.id);
    socketRoomMap.delete(socket.id);
    if (roomID) handleLeave(io, socket, roomID);
  });

  // ─── game:start ─────────────────────────────────────────────────────────────
  socket.on("game:start", ({ roomID }, callback) => {
    try {
      const room = roomService.startGame(roomID, socket.id, onRoundEnd(io));

      io.to(roomID).emit("game:round-started", {
        room: roomService.getRoomPublic(room),
      });

      io.to(room.drawerId!).emit("game:word-reveal", { word: room.word });

      callback?.({ ok: true });
    } catch (err: any) {
      callback?.({ ok: false, error: err?.message ?? "Unknown error" });
    }
  });

  // ─── game:guess ─────────────────────────────────────────────────────────────
  // payload: { roomID, guess }
  socket.on("game:guess", ({ roomID, guess }, callback) => {
    try {
      const { result, room, roundOver } = roomService.processGuess({
        roomID,
        socketId: socket.id,
        guess,
      });

      const player = room.players[socket.id];

      if (result === "correct") {
        socket.emit("game:guess-correct", { score: player.score });

        socket.to(roomID).emit("game:player-guessed", {
          playerID: player.playerID,
          name: player.name,
        });

        if (roundOver) {
          handleRoundEnd(io, room.roomID, room.word!, room.phase === "gameEnd");
        }
      } else if (result === "wrong") {
        // Falsche Guesses als Chat-Nachricht für alle sichtbar
        io.to(roomID).emit("room:message", {
          type: "guess",
          playerID: player.playerID,
          name: player.name,
          text: guess.trim().slice(0, 100),
          createdAt: new Date().toISOString(),
        });
      }

      callback?.({ ok: true, result });
    } catch (err: any) {
      callback?.({ ok: false, error: err?.message ?? "Unknown error" });
    }
  });

  // ─── room:message ───────────────────────────────────────────────────────────
  // Normale Chat-Nachricht (kein Guess) – nur in der Lobby oder nach Ratenende
  socket.on("room:message", ({ roomID, text }) => {
    const room = roomService.getRoom(roomID);
    if (!room) return;
    if (room.phase === "playing") return; // während des Spiels nur Guesses erlaubt

    const player = room.players[socket.id];
    if (!player) return;

    const safeText = String(text ?? "")
      .trim()
      .slice(0, 200);
    if (!safeText) return;

    io.to(roomID).emit("room:message", {
      type: "chat",
      playerID: player.playerID,
      name: player.name,
      text: safeText,
      createdAt: new Date().toISOString(),
    });
  });

  // ─── draw:stroke ────────────────────────────────────────────────────────────
  // Batched Zeichendaten: [{ x, y, color, size, type }]
  socket.on("draw:stroke", ({ roomID, strokes }) => {
    const room = roomService.getRoom(roomID);
    if (!room || room.drawerId !== socket.id) return;
    if (room.phase !== "playing") return;

    socket.to(roomID).emit("draw:stroke", { strokes });
  });

  // ─── draw:clear ─────────────────────────────────────────────────────────────
  socket.on("draw:clear", ({ roomID }) => {
    const room = roomService.getRoom(roomID);
    if (!room || room.drawerId !== socket.id) return;

    socket.to(roomID).emit("draw:clear");
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function handleLeave(io: Server, socket: Socket, roomID: string): void {
  const room = roomService.leaveRoom(roomID, socket.id);
  socket.leave(roomID);

  if (!room) return; // Raum war leer → gelöscht

  io.to(roomID).emit("room:player-left", {
    socketId: socket.id,
    room: roomService.getRoomPublic(room),
  });
}

// Gibt eine Callback-Funktion zurück die der Service aufruft wenn der Timer abläuft
function onRoundEnd(io: Server): roomService.RoundEndCallback {
  return (roomID, word, isGameEnd) => {
    handleRoundEnd(io, roomID, word, isGameEnd);
  };
}

function handleRoundEnd(
  io: Server,
  roomID: string,
  word: string,
  isGameEnd: boolean,
): void {
  io.to(roomID).emit("game:round-ended", { word });

  if (isGameEnd) {
    const room = roomService.getRoom(roomID);
    io.to(roomID).emit("game:ended", {
      players: room ? Object.values(room.players) : [],
    });
    return;
  }

  setTimeout(() => {
    try {
      const room = roomService.nextRound(roomID, onRoundEnd(io));
      io.to(roomID).emit("game:round-started", {
        room: roomService.getRoomPublic(room),
      });
      io.to(room.drawerId!).emit("game:word-reveal", { word: room.word });
    } catch {
      // Raum existiert nicht mehr – kein Problem
    }
  }, ROUND_END_DELAY_MS);
}
