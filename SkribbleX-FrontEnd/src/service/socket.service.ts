// SocketService.ts
import { socket } from "../socket";

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
  async createRoom() {
    console.debug("Creating new room");

    return new Promise<string>((resolve, reject) => {
      socket.emit("room:create", {}, (response: CreateRoomResponse) => {
        console.log("room:create response", response);

        if (!response?.ok || !response.roomID) {
          reject(new Error(response?.error ?? "Failed to create room"));
          return;
        }

        resolve(response.roomID);
      });
    });
  }

  joinRoom(roomID: string) {
    console.debug("Joining room with roomID: " + roomID);

    return new Promise<void>((resolve, reject) => {
      socket.emit(
        "room:join",
        { roomId: roomID },
        (response: JoinRoomResponse) => {
          console.log("room:join response", response);

          if (!response?.ok) {
            reject(new Error(response?.error ?? "Failed to join room"));
            return;
          }

          resolve();
        }
      );
    });
  }
}

// Singleton-Instanz exportieren, damit du sie überall nutzen kannst
export const socketService = new SocketService();
