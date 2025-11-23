// src/services/RoomService.ts

import type { RoomState } from "../types/RoomState";
import type { Player } from "../types/Player";

const rooms = new Map<string, RoomState>();

export class RoomService {
  static getOrCreateRoom(roomId: string): RoomState {
    let room = rooms.get(roomId);
    if (!room) {
      room = {
        players: {},
        drawerId: null,
        word: null,
        round: 0,
        started: false,
      };
      rooms.set(roomId, room);
    }
    return room;
  }

  static getRoom(roomId: string): RoomState | undefined {
    return rooms.get(roomId);
  }

  static removeRoom(roomId: string): void {
    rooms.delete(roomId);
  }

  static addPlayer(roomId: string, userId: string, username: string) {
    const room = RoomService.getOrCreateRoom(roomId);
    if (!room.players[userId]) {
      const p: Player = { id: userId, name: username, score: 0 };
      room.players[userId] = p;
    }
    return room;
  }
}
