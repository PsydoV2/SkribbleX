// src/socket/room.events.ts
import type { Server, Socket } from "socket.io";
import * as roomService from "../services/room.service";
import type { RoomState } from "../types/RoomState";
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
  socket.on("room:join", ({ roomID, playerID, name, avatar }, callback) => {
    try {
      const { room, reconnected } = roomService.joinRoom({
        roomID,
        socketId: socket.id,
        playerID,
        name,
        avatar: avatar ?? null,
      });

      socket.join(roomID);
      socketRoomMap.set(socket.id, roomID);

      callback?.({ ok: true, room: roomService.getRoomPublic(room), reconnected });

      if (reconnected) {
        // Inform others that the player is back
        socket.to(roomID).emit("room:player-rejoined", {
          player: room.players[socket.id],
          room: roomService.getRoomPublic(room),
        });
      } else {
        socket.to(roomID).emit("room:player-joined", {
          player: room.players[socket.id],
          room: roomService.getRoomPublic(room),
        });
      }
    } catch (err: any) {
      callback?.({ ok: false, error: err?.message ?? "Unknown error" });
    }
  });

  // ─── room:kick ──────────────────────────────────────────────────────────────
  socket.on("room:kick", ({ roomID, targetSocketId }, callback) => {
    try {
      const room = roomService.kickPlayer(roomID, socket.id, targetSocketId);

      // Gekicktem Spieler Bescheid geben
      io.to(targetSocketId).emit("room:kicked", { roomID });

      // Alle anderen bekommen den aktualisierten Raum
      io.to(roomID).emit("room:player-left", {
        socketId: targetSocketId,
        room: roomService.getRoomPublic(room),
      });

      callback?.({ ok: true });
    } catch (err: any) {
      callback?.({ ok: false, error: err?.message ?? "Unknown error" });
    }
  });

  // ─── room:leave ─────────────────────────────────────────────────────────────
  socket.on("room:leave", ({ roomID }) => {
    socketRoomMap.delete(socket.id); // ← Mapping entfernen
    handleLeave(io, socket, roomID);
  });

  // ─── disconnect ─────────────────────────────────────────────────────────────
  // socket.rooms ist hier bereits leer – deshalb socketRoomMap nutzen
  socket.on("disconnect", () => {
    const roomID = socketRoomMap.get(socket.id);
    socketRoomMap.delete(socket.id);
    if (roomID) handleLeave(io, socket, roomID);
  });

  // ─── lobby:settings ─────────────────────────────────────────────────────────
  socket.on(
    "lobby:settings",
    ({ roomID, language, categories, maxRounds }, callback) => {
      try {
        const room = roomService.updateSettings(roomID, socket.id, {
          language,
          categories,
          maxRounds,
        });
        io.to(roomID).emit("lobby:settings-updated", {
          room: roomService.getRoomPublic(room),
        });
        callback?.({ ok: true });
      } catch (err: any) {
        callback?.({ ok: false, error: err?.message ?? "Unknown error" });
      }
    },
  );

  // ─── game:reset-to-lobby ────────────────────────────────────────────────────
  socket.on("game:reset-to-lobby", ({ roomID }, callback) => {
    try {
      const room = roomService.resetToLobby(roomID, socket.id);
      io.to(roomID).emit("game:lobby-reset", {
        room: roomService.getRoomPublic(room),
      });
      callback?.({ ok: true });
    } catch (err: any) {
      callback?.({ ok: false, error: err?.message ?? "Unknown error" });
    }
  });

  // ─── game:start ─────────────────────────────────────────────────────────────
  socket.on("game:start", ({ roomID }, callback) => {
    try {
      const room = roomService.startGame(
        roomID,
        socket.id,
        onRoundEnd(io),
        onRoundPlaying(io),
      );

      // Alle Spieler gehen in die Wortauswahl-Phase
      io.to(roomID).emit("game:selecting-word", {
        room: roomService.getRoomPublic(room),
      });

      // Nur der Drawer bekommt die 3 Wortoptionen
      io.to(room.drawerId!).emit("game:word-choices", {
        words: room.wordChoices,
      });

      callback?.({ ok: true });
    } catch (err: any) {
      callback?.({ ok: false, error: err?.message ?? "Unknown error" });
    }
  });

  // ─── game:select-word ────────────────────────────────────────────────────────
  // Der Drawer wählt eines der 3 angebotenen Wörter
  socket.on("game:select-word", ({ roomID, word }, callback) => {
    try {
      const room = roomService.selectWord(
        roomID,
        socket.id,
        word,
        onRoundEnd(io),
      );

      // Runde startet für alle
      io.to(roomID).emit("game:round-started", {
        room: roomService.getRoomPublic(room),
      });

      // Drawer bekommt das Wort zur Bestätigung
      io.to(room.drawerId!).emit("game:word-reveal", { word: room.word });

      // Buchstaben-Aufdeckung planen
      scheduleHintReveals(io, room);

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
        socket.emit("game:guess-correct", {
          score: player.score,
          room: roomService.getRoomPublic(room),
        });

        socket.to(roomID).emit("game:player-guessed", {
          playerID: player.playerID,
          name: player.name,
          room: roomService.getRoomPublic(room),
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

    room.strokeHistory.push(strokes);
    socket.to(roomID).emit("draw:stroke", { strokes });
  });

  // ─── draw:clear ─────────────────────────────────────────────────────────────
  socket.on("draw:clear", ({ roomID }) => {
    const room = roomService.getRoom(roomID);
    if (!room || room.drawerId !== socket.id) return;

    room.strokeHistory = [];
    socket.to(roomID).emit("draw:clear");
  });

  // ─── draw:undo ──────────────────────────────────────────────────────────────
  socket.on("draw:undo", ({ roomID }) => {
    const room = roomService.getRoom(roomID);
    if (!room || room.drawerId !== socket.id) return;
    if (room.phase !== "playing") return;

    room.strokeHistory.pop();
    // Send all remaining strokes so clients can reconstruct the canvas
    io.to(roomID).emit("draw:canvas-sync", { strokes: room.strokeHistory });
  });

  // ─── draw:fill ──────────────────────────────────────────────────────────────
  socket.on("draw:fill", ({ roomID, x, y, color }) => {
    const room = roomService.getRoom(roomID);
    if (!room || room.drawerId !== socket.id) return;
    if (room.phase !== "playing") return;

    socket.to(roomID).emit("draw:fill", { x, y, color });
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

// Wird aufgerufen wenn der Drawer ein Wort gewählt hat (oder auto-select)
function onRoundPlaying(io: Server): roomService.OnRoundPlayingCallback {
  return (roomID, word) => {
    const room = roomService.getRoom(roomID);
    if (!room) return;

    io.to(roomID).emit("game:round-started", {
      room: roomService.getRoomPublic(room),
    });
    io.to(room.drawerId!).emit("game:word-reveal", { word });
    scheduleHintReveals(io, room);
  };
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
  const room = roomService.getRoom(roomID);
  io.to(roomID).emit("game:round-ended", {
    word,
    room: room ? roomService.getRoomPublic(room) : null,
  });

  if (isGameEnd) {
    setTimeout(() => {
      const r = roomService.getRoom(roomID);
      io.to(roomID).emit("game:ended", {
        players: r ? Object.values(r.players) : [],
      });
    }, ROUND_END_DELAY_MS);
    return;
  }

  setTimeout(() => {
    try {
      const nextRoom = roomService.nextRound(
        roomID,
        onRoundEnd(io),
        onRoundPlaying(io),
      );
      // Alle Spieler gehen in die Wortauswahl-Phase
      io.to(roomID).emit("game:selecting-word", {
        room: roomService.getRoomPublic(nextRoom),
      });
      // Nur der neue Drawer bekommt die Wortoptionen
      io.to(nextRoom.drawerId!).emit("game:word-choices", {
        words: nextRoom.wordChoices,
      });
    } catch {
      // Raum existiert nicht mehr – kein Problem
    }
  }, ROUND_END_DELAY_MS);
}

// ─── Buchstaben-Aufdeckung ────────────────────────────────────────────────────

function scheduleHintReveals(io: Server, room: RoomState): void {
  // Buchstaben werden bei 30%, 55% und 75% der Rundenzeit aufgedeckt
  const revealRatios = [0.30, 0.55, 0.75];

  for (const ratio of revealRatios) {
    const delay = Math.round(ratio * room.roundDurationMs);
    const handle = setTimeout(() => {
      if (room.phase !== "playing" || !room.word || !room.currentHint) return;
      room.currentHint = revealNextLetter(room.word, room.currentHint);
      io.to(room.roomID).emit("game:hint-update", { hint: room.currentHint });
    }, delay);
    room.revealTimerHandles.push(handle);
  }
}

function revealNextLetter(word: string, hint: string): string {
  const unrevealed: number[] = [];
  for (let i = 0; i < word.length; i++) {
    if (word[i] !== " " && hint[i] === "_") {
      unrevealed.push(i);
    }
  }
  if (unrevealed.length === 0) return hint;
  const idx = unrevealed[Math.floor(Math.random() * unrevealed.length)];
  const chars = hint.split("");
  chars[idx] = word[idx];
  return chars.join("");
}
