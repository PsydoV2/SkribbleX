// src/types/RoomState.ts
import type { Player } from "./Player";
import type { Language } from "../services/word.service";

export type GamePhase = "lobby" | "playing" | "roundEnd" | "gameEnd";

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
  // Lobby-Einstellungen (Host wählt)
  language: Language;
  categories: string[];
}
