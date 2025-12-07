// src/socket/index.ts
import type http from "http";
import type https from "https";
import { Server } from "socket.io";
import { registerRoomEvents } from "../events/room.events";

export function initSocket(server: http.Server | https.Server) {
  const io = new Server(server, {
    cors: {
      origin: "*", // später einschränken auf Discord-URLs
    },
  });

  io.on("connection", (socket) => {
    console.log("🟢 Socket connected:", socket.id);

    // hier alle "Routen" für Socket.io registrieren
    registerRoomEvents(io, socket);

    socket.on("disconnect", () => {
      console.log("🔴 Socket disconnected:", socket.id);
    });
  });
}
