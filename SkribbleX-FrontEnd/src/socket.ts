// src/socket.ts
import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (socket) return socket;

  const params = new URLSearchParams(window.location.search);
  const isDiscordActivity = params.has("instance_id") || params.has("frame_id");

  // In Discord: connect via relative /backend path — patchUrlMappings() in discord.ts
  // rewrites this to the actual backend URL through Discord's proxy.
  // In browser: connect directly to the backend URL.
  const url = isDiscordActivity
    ? `${window.location.origin}/backend`
    : (process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8080");

  socket = io(url, {
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    transports: ["websocket"],
  });

  return socket;
}
