// src/types/RoomState.ts
import type { Player } from "./Player";

export type GamePhase = "lobby" | "playing" | "roundEnd" | "gameEnd";
export type Language = "de" | "en";

export interface RoomState {
  roomID: string;
  players: Record<string, Player>;
  hostId: string | null;
  drawerId: string | null;
  word: string | null;
  round: number;
  maxRounds: number;
  roundDurationMs: number;
  phase: GamePhase;
  guessedPlayerIds: Set<string>;
  roundStartedAt: number | null;
  roundTimerHandle: ReturnType<typeof setTimeout> | null;
  language: Language;
  categories: string[];
}
