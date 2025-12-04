import { io } from "socket.io-client";

// "undefined" means the URL will be computed from the `window.location` object
const URL =
  (import.meta.env.VITE_BACKEND_URL as string) ?? "http://localhost:8080";

export const socket = io(URL);
