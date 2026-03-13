// src/types/Player.ts

export interface Player {
  playerID: string; // Discord User ID
  socketId: string;
  name: string;
  score: number;
  hasGuessed: boolean;
}
