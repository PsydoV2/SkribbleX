// src/socket.ts
import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (socket) return socket;

  // Guard against SSR — this function must only run in the browser
  if (typeof window === "undefined") {
    throw new Error("getSocket() called during SSR");
  }

  const params = new URLSearchParams(window.location.search);
  const isDiscordActivity = params.has("instance_id") || params.has("frame_id");

  if (isDiscordActivity) {
    // Inside Discord Activity:
    // Discord's proxy sits at https://{client_id}.discordsays.com and routes
    // /backend/* → https://sfalter.de:8444/*.
    // socket.io must use `path: "/backend/socket.io"` so that the Engine.IO
    // handshake hits /backend/socket.io/... — Discord strips the /backend prefix
    // and forwards /socket.io/... to the backend.
    // Using io("origin/backend") would treat /backend as a namespace, causing
    // the handshake to go to /socket.io/ (no prefix) which the proxy ignores.// WICHTIG: Wir geben KEINE URL an (oder nur window.location.origin).
    // Wenn wir keine URL angeben, nutzt io() automatisch die aktuelle Domain.
    socket = io({
      path: "/backend/socket.io", // Der Proxy-Pfad aus dem Developer Portal
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      transports: ["websocket", "polling"],
    });
  } else {
    // Plain browser: connect directly to the backend URL.
    socket = io(
      process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:4000",
      {
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        transports: ["websocket"],
      },
    );
  }

  return socket;
}
