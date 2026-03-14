// src/types/RoomState.ts
import type { Player } from "./Player";

export type GamePhase = "lobby" | "wordSelection" | "playing" | "roundEnd" | "gameEnd";
export type Language = "de" | "en";

export interface RoomState {
  roomID: string;
  players: Record<string, Player>;
  hostId: string | null;
  drawerId: string | null;
  word: string | null;
  wordChoices: string[] | null;
  round: number;
  maxRounds: number;
  roundDurationMs: number;
  phase: GamePhase;
  guessedPlayerIds: Set<string>;
  roundStartedAt: number | null;
  roundTimerHandle: ReturnType<typeof setTimeout> | null;
  wordSelectionTimerHandle: ReturnType<typeof setTimeout> | null;
  revealTimerHandles: ReturnType<typeof setTimeout>[];
  currentHint: string | null;
  language: Language;
  categories: string[];
}
