import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (socket) return socket;

  // Guard against SSR — diese Funktion darf nur im Browser laufen
  if (typeof window === "undefined") {
    throw new Error("getSocket() called during SSR");
  }

  /**
   * Discord Activity Erkennung:
   * Wenn die App innerhalb des Discord-Proxys läuft, endet der Hostname auf .discordsays.com
   */
  const isDiscordActivity =
    window.location.hostname.endsWith("discordsays.com");

  if (isDiscordActivity) {
    console.debug("[Socket] In Discord erkannt via Domain. Nutze Proxy-Pfad.");

    /**
     * WICHTIG: Im Discord-Modus MUSS die Verbindung über die aktuelle Origin gehen,
     * damit die Content Security Policy (CSP) nicht greift.
     * Der Pfad '/backend/socket.io' muss im Discord Developer Portal
     * auf dein API-Backend gemappt sein.
     */
    socket = io(window.location.origin, {
      path: "/backend/socket.io",
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      // Wir erlauben Polling als Fallback, falls WebSockets im Proxy hängen
      transports: ["polling", "websocket"],
    });
  } else {
    console.debug("[Socket] Nicht in Discord. Nutze direkte Backend-URL.");

    /**
     * Normaler Browser-Modus (Lokal oder direkt auf deiner Website).
     * Hier verbinden wir uns direkt mit der API-Domain.
     */
    const backendUrl =
      process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:4000";

    socket = io(backendUrl, {
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      transports: ["websocket"],
    });
  }

  // Debug-Helper für den Verbindungsstatus
  socket.on("connect", () => {
    console.debug("[Socket] Verbunden mit ID:", socket?.id);
  });

  socket.on("connect_error", (err) => {
    console.debug("[Socket] Verbindungsfehler:", err.message);
  });

  return socket;
}
