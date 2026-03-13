// src/types/game.ts
// Mirror of the backend's getRoomPublic() shape — no secret word ever comes here.

export type GamePhase = "lobby" | "playing" | "roundEnd" | "gameEnd";
export type Language = "de" | "en";

export interface Player {
  playerID: string; // Discord User ID
  socketId: string;
  name: string;
  score: number;
  hasGuessed: boolean;
}

export interface PublicRoom {
  roomID: string;
  players: Player[];
  hostId: string | null;
  drawerId: string | null;
  round: number;
  maxRounds: number;
  phase: GamePhase;
  wordLength: number | null;
  timeLeftMs: number | null;
  language: Language;
  categories: string[];
  availableCategories: string[];
}

// What the Discord SDK resolves to (subset we actually use)
export interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
}
