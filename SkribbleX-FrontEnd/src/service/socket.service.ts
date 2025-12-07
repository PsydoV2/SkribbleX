// SocketService.ts
import { socket } from "../socket";

export class SocketService {
  createRoom() {
    console.debug("Creating new room");

    socket.emit("room:create", {}, (response) => {
      console.log("room:create response", response);
    });
  }

  joinRoom(roomID: string) {
    console.debug("Joining room with roomID: " + roomID);

    socket.emit("room:join", { roomID }, (response) => {
      console.log("room:join response", response);
    });
  }
}

// Singleton-Instanz exportieren, damit du sie überall nutzen kannst
export const socketService = new SocketService();
