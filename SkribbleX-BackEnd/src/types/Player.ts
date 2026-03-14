// src/types/Player.ts

export interface Player {
  playerID: string; // Discord User ID (or random ID for browser guests)
  socketId: string;
  name: string;
  avatar: string | null; // Discord avatar hash, full URL (browser guests), or null
  score: number;
  hasGuessed: boolean;
}
