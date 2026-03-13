// src/socket/index.ts
import type http from "http";
import type https from "https";
import { Server } from "socket.io";
import { registerRoomEvents } from "../events/room.events"; // ← Pfad korrigiert

export function initSocket(server: http.Server | https.Server) {
  const io = new Server(server, {
    cors: {
      origin: "*", // später einschränken auf Discord-URLs
    },
  });

  io.on("connection", (socket) => {
    console.log("🟢 Socket connected:", socket.id);

    // disconnect wird in registerRoomEvents behandelt – nicht doppelt registrieren
    registerRoomEvents(io, socket);
  });
}
