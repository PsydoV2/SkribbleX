// src/socket/index.ts
import type http from "http";
import type https from "https";
import { Server as SocketIOServer } from "socket.io";
import { RoomService } from "../services/room.service";
import { WordService } from "../services/word.service";

export function initSocket(server: http.Server | https.Server) {
  const io = new SocketIOServer(server, {
    cors: {
      origin: "*", // später einschränken
    },
  });

  io.on("connection", (socket) => {
    console.log("🔌 Client connected:", socket.id);

    socket.on("join", ({ roomId, userId, username }) => {
      socket.join(roomId);
      const room = RoomService.addPlayer(roomId, userId, username);

      io.to(roomId).emit("state:update", room);
    });

    socket.on("startGame", ({ roomId }) => {
      const room = RoomService.getOrCreateRoom(roomId);
      const ids = Object.keys(room.players);
      if (ids.length === 0) return;

      room.started = true;
      room.round += 1;
      room.drawerId = ids[Math.floor(Math.random() * ids.length)];
      room.word = WordService.getRandomWord();

      io.to(roomId).emit("round:start", {
        drawerId: room.drawerId,
        wordLength: room.word.length,
      });
    });

    socket.on("draw:segment", ({ roomId, segment }) => {
      socket.to(roomId).emit("draw:segment", segment);
    });

    socket.on("guess", ({ roomId, userId, text }) => {
      const room = RoomService.getRoom(roomId);
      if (!room || !room.word) return;

      if (text.trim().toLowerCase() === room.word.toLowerCase()) {
        room.players[userId].score += 1;

        io.to(roomId).emit("round:end", {
          winnerId: userId,
          word: room.word,
          players: room.players,
        });

        room.word = null;
      }
    });

    socket.on("disconnect", () => {
      console.log("❌ Client disconnected:", socket.id);
      // TODO: Room-Cleanup
    });
  });

  return io;
}
