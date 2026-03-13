// src/service/socket.service.ts
import { getSocket } from "@/socket";

type CreateRoomResponse = {
  ok: boolean;
  roomID: string;
  error?: string;
};

type JoinRoomResponse = {
  ok: boolean;
  error?: string;
};

export class SocketService {
  createRoom(): Promise<string> {
    console.debug("Creating new room");
    const socket = getSocket();

    return new Promise<string>((resolve, reject) => {
      socket.emit("room:create", {}, (response: CreateRoomResponse) => {
        console.debug("room:create response", response);

        if (!response?.ok || !response.roomID) {
          reject(new Error(response?.error ?? "Failed to create room"));
          return;
        }

        resolve(response.roomID);
      });
    });
  }

  joinRoom(roomID: string, playerID: string, name: string): Promise<void> {
    console.debug("Joining room:", roomID);
    const socket = getSocket();

    return new Promise<void>((resolve, reject) => {
      socket.emit(
        "room:join",
        { roomID, playerID, name }, // ← matches backend payload exactly
        (response: JoinRoomResponse) => {
          console.debug("room:join response", response);

          if (!response?.ok) {
            reject(new Error(response?.error ?? "Failed to join room"));
            return;
          }

          resolve();
        },
      );
    });
  }
}

export const socketService = new SocketService();
