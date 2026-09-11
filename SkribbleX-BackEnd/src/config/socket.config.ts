// src/config/socket.config.ts
import type http from "http";
import type https from "https";
import { Server } from "socket.io";
import { registerRoomEvents } from "../events/room.events";

let ioInstance: Server | null = null;

export function initSocket(server: http.Server | https.Server): Server {
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

  ioInstance = io;
  return io;
}

/** Returns the running Socket.io server, or `null` before `initSocket()` has run. */
export function getIO(): Server | null {
  return ioInstance;
}
