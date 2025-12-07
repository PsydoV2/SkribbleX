// src/services/room.service.ts
import { nanoid } from "nanoid";
import { RoomState } from "../types/RoomState";

type JoinRoomPayload = { roomID: string; socketId: string };

export async function createRoom() {
  // DB-Insert etc.
  const roomID: string = nanoid(6).toUpperCase();

  console.debug("Creating room with ID: ", roomID);

  return roomID;
}

export async function joinRoom(payload: JoinRoomPayload) {
  // DB-Check, Pin prüfen, User in Room eintragen ...
  console.debug("Joining room with ID: ", payload.roomID);
  // return { id: payload.roomId, userId: "..." };
}

export async function saveMessage(args: {
  roomId: string;
  message: string;
  socketId: string;
}) {
  // Nachricht speichern, Daten vorbereiten
  return {
    id: "msg-id",
    roomId: args.roomId,
    text: args.message,
    fromSocket: args.socketId,
    createdAt: new Date().toISOString(),
  };
}
