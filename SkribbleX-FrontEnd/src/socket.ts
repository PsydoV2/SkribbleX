// src/socket.ts
// Socket is created lazily (only on the client) to avoid SSR crashes.
// Import `getSocket()` instead of `socket` directly when you need the instance.

import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const url = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8080";

    socket = io(url, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
    });
  }
  return socket;
}
