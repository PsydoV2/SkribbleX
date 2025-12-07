// src/socket/room.events.ts
import type { Server, Socket } from "socket.io";
import * as roomService from "../services/room.service";
import { RoomState } from "../types/RoomState";
import { LogHelper } from "../utils/LogHelper";

export function registerRoomEvents(io: Server, socket: Socket) {
  // Raum erstellen
  socket.on("room:create", async (payload, callback) => {
    try {
      const roomID: string = await roomService.createRoom();
      // optional in Raum joinen
      socket.join(roomID);
      callback?.({ ok: true, roomID });
    } catch (err: any) {
      LogHelper.logInfo("room:create", err);
      console.error("room:create ", err);
      callback?.({ ok: false, error: err.message ?? "Unknown error" });
    }
  });

  // Raum beitreten
  socket.on("room:join", async ({ roomId: roomID }, callback) => {
    try {
      const room = await roomService.joinRoom({
        roomID: roomID,
        socketId: socket.id,
      });

      socket.join(roomID);

      callback?.({ ok: true, room });

      // den anderen im Raum sagen, dass jemand dazugekommen ist
      io.to(roomID).emit("room:user-joined", {});
    } catch (err: any) {
      console.error("room:join error", err);
      callback?.({ ok: false, error: err.message ?? "Unknown error" });
    }
  });

  // Beispiel: Message im Raum
  socket.on("room:message", async ({ roomId, message }) => {
    // ggf. Service-Schicht benutzen
    const msg = await roomService.saveMessage({
      roomId,
      message,
      socketId: socket.id,
    });
    io.to(roomId).emit("room:message", msg);
  });
}
