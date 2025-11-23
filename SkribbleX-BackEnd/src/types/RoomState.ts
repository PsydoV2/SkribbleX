// src/types/RoomState.ts

import type { Player } from "./Player";

export interface RoomState {
  players: Record<string, Player>;
  drawerId: string | null;
  word: string | null;
  round: number;
  started: boolean;
}
