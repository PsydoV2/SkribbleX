// src/services/room.service.ts
import { customAlphabet } from "nanoid";
import type { RoomState, Language } from "../types/RoomState";
import type { Player } from "../types/Player";
import { WordService } from "./word.service";

const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const nano = customAlphabet(alphabet, 6);

const ROUND_DURATION_MS = 80_000;

const rooms = new Map<string, RoomState>();

// ─── Room erstellen ───────────────────────────────────────────────────────────

export function createRoom(): string {
  const roomID = nano();

  rooms.set(roomID, {
    roomID,
    players: {},
    hostId: null,
    drawerId: null,
    word: null,
    round: 0,
    maxRounds: 3,
    roundDurationMs: ROUND_DURATION_MS,
    phase: "lobby",
    guessedPlayerIds: new Set(),
    roundStartedAt: null,
    roundTimerHandle: null,
    language: "de",
    categories: WordService.getCategories("de"),
  });

  console.debug(`[room] Created: ${roomID}`);
  return roomID;
}

// ─── Room abrufen ─────────────────────────────────────────────────────────────

export function getRoom(roomID: string): RoomState | undefined {
  return rooms.get(roomID);
}

// ─── Spieler beitreten ────────────────────────────────────────────────────────

export function joinRoom(payload: {
  roomID: string;
  socketId: string;
  playerID: string;
  name: string;
}): RoomState {
  const room = rooms.get(payload.roomID);
  if (!room) throw { status: 404, message: "Room not found" };
  if (room.phase !== "lobby")
    throw { status: 400, message: "Game already started" };

  const alreadyIn = Object.values(room.players).some(
    (p) => p.playerID === payload.playerID,
  );
  if (alreadyIn) throw { status: 409, message: "Already in room" };

  const player: Player = {
    playerID: payload.playerID,
    socketId: payload.socketId,
    name: payload.name.trim().slice(0, 32),
    score: 0,
    hasGuessed: false,
  };

  room.players[payload.socketId] = player;
  if (!room.hostId) room.hostId = payload.socketId;

  console.debug(`[room] ${player.name} joined ${payload.roomID}`);
  return room;
}

// ─── Spieler verlassen ────────────────────────────────────────────────────────

export function leaveRoom(roomID: string, socketId: string): RoomState | null {
  const room = rooms.get(roomID);
  if (!room) return null;

  delete room.players[socketId];

  if (room.hostId === socketId) {
    const remaining = Object.keys(room.players);
    room.hostId = remaining[0] ?? null;
  }

  if (Object.keys(room.players).length === 0) {
    clearRoundTimer(room);
    rooms.delete(roomID);
    console.debug(`[room] Deleted empty room: ${roomID}`);
    return null;
  }

  console.debug(`[room] Socket ${socketId} left ${roomID}`);
  return room;
}

// ─── Lobby-Settings ändern ────────────────────────────────────────────────────

export function updateSettings(
  roomID: string,
  socketId: string,
  patch: {
    language?: Language;
    categories?: string[];
    maxRounds?: number;
  },
): RoomState {
  const room = rooms.get(roomID);
  if (!room) throw { status: 404, message: "Room not found" };
  if (room.hostId !== socketId)
    throw { status: 403, message: "Only the host can change settings" };
  if (room.phase !== "lobby")
    throw { status: 400, message: "Game already started" };

  if (patch.language !== undefined) {
    room.language = patch.language;
    room.categories = WordService.getCategories(patch.language);
  }
  if (patch.categories !== undefined && patch.categories.length > 0) {
    room.categories = patch.categories;
  }
  if (patch.maxRounds !== undefined) {
    room.maxRounds = patch.maxRounds;
  }

  return room;
}

// ─── Spiel starten ────────────────────────────────────────────────────────────

export type RoundEndCallback = (
  roomID: string,
  word: string,
  isGameEnd: boolean,
) => void;

export function startGame(
  roomID: string,
  socketId: string,
  onRoundEnd: RoundEndCallback,
): RoomState {
  const room = rooms.get(roomID);
  if (!room) throw { status: 404, message: "Room not found" };
  if (room.hostId !== socketId)
    throw { status: 403, message: "Only the host can start the game" };
  if (Object.keys(room.players).length < 2)
    throw { status: 400, message: "Need at least 2 players" };
  if (room.phase !== "lobby")
    throw { status: 400, message: "Game already started" };

  return startNextRound(room, onRoundEnd);
}

// ─── Runde starten (intern) ───────────────────────────────────────────────────

function startNextRound(
  room: RoomState,
  onRoundEnd: RoundEndCallback,
): RoomState {
  const playerIds = Object.keys(room.players);
  clearRoundTimer(room);

  room.round += 1;
  room.phase = "playing";
  room.word = WordService.getRandomWord(room.language, room.categories);
  room.guessedPlayerIds = new Set();
  room.roundStartedAt = Date.now();

  const drawerIndex = (room.round - 1) % playerIds.length;
  room.drawerId = playerIds[drawerIndex];

  for (const p of Object.values(room.players)) {
    p.hasGuessed = false;
  }

  room.roundTimerHandle = setTimeout(() => {
    if (room.phase !== "playing") return;
    const word = room.word!;
    const isGameEnd = endRound(room);
    onRoundEnd(room.roomID, word, isGameEnd);
  }, room.roundDurationMs);

  console.debug(
    `[room] Round ${room.round} started in ${room.roomID}, drawer: ${room.drawerId}`,
  );
  return room;
}

// ─── Guess verarbeiten ────────────────────────────────────────────────────────

export type GuessResult = "correct" | "wrong" | "already_guessed" | "drawer";

export function processGuess(payload: {
  roomID: string;
  socketId: string;
  guess: string;
}): { result: GuessResult; room: RoomState; roundOver: boolean } {
  const room = rooms.get(payload.roomID);
  if (!room) throw { status: 404, message: "Room not found" };
  if (room.phase !== "playing")
    throw { status: 400, message: "Game is not running" };

  if (room.drawerId === payload.socketId)
    return { result: "drawer", room, roundOver: false };
  if (room.guessedPlayerIds.has(payload.socketId))
    return { result: "already_guessed", room, roundOver: false };

  const guess = payload.guess.trim().slice(0, 100);
  const isCorrect = guess.toLowerCase() === room.word?.toLowerCase();

  if (isCorrect) {
    room.guessedPlayerIds.add(payload.socketId);
    room.players[payload.socketId].hasGuessed = true;
    room.players[payload.socketId].score += calculateGuesserScore(room);

    const nonDrawers = Object.keys(room.players).filter(
      (id) => id !== room.drawerId,
    );
    const allGuessed = room.guessedPlayerIds.size >= nonDrawers.length;

    if (allGuessed) {
      awardDrawerPoints(room);
      const isGameEnd = endRound(room);
      return { result: "correct", room, roundOver: true };
    }

    return { result: "correct", room, roundOver: false };
  }

  return { result: "wrong", room, roundOver: false };
}

// ─── Runde beenden ────────────────────────────────────────────────────────────

export function endRound(room: RoomState): boolean {
  clearRoundTimer(room);
  const isGameEnd = room.round >= room.maxRounds;
  room.phase = isGameEnd ? "gameEnd" : "roundEnd";
  return isGameEnd;
}

export function nextRound(
  roomID: string,
  onRoundEnd: RoundEndCallback,
): RoomState {
  const room = rooms.get(roomID);
  if (!room) throw { status: 404, message: "Room not found" };
  return startNextRound(room, onRoundEnd);
}

// ─── Lobby zurücksetzen ───────────────────────────────────────────────────────

export function resetToLobby(roomID: string, requesterId: string): RoomState {
  const room = rooms.get(roomID);
  if (!room) throw { status: 404, message: "Room not found" };
  if (room.hostId !== requesterId)
    throw { status: 403, message: "Only the host can reset" };

  clearRoundTimer(room);

  for (const player of Object.values(room.players)) {
    player.score = 0;
    player.hasGuessed = false;
  }

  room.phase = "lobby";
  room.round = 0;
  room.drawerId = null;
  room.word = null;
  room.guessedPlayerIds = new Set();
  room.roundStartedAt = null;

  return room;
}

// ─── Score berechnen ─────────────────────────────────────────────────────────

function calculateGuesserScore(room: RoomState): number {
  if (!room.roundStartedAt) return 100;
  const elapsed = Date.now() - room.roundStartedAt;
  const ratio = Math.max(0, 1 - elapsed / room.roundDurationMs);
  return Math.round(50 + ratio * 100);
}

function awardDrawerPoints(room: RoomState): void {
  if (!room.drawerId || !room.players[room.drawerId]) return;
  const nonDrawers = Object.keys(room.players).filter(
    (id) => id !== room.drawerId,
  );
  const guessedRatio = room.guessedPlayerIds.size / nonDrawers.length;
  room.players[room.drawerId].score += Math.round(guessedRatio * 100);
}

// ─── Timer aufräumen ─────────────────────────────────────────────────────────

function clearRoundTimer(room: RoomState): void {
  if (room.roundTimerHandle) {
    clearTimeout(room.roundTimerHandle);
    room.roundTimerHandle = null;
  }
}

// ─── Serialisierbare Room-Daten (ohne Wort!) ──────────────────────────────────

export function getRoomPublic(room: RoomState) {
  const timeLeftMs =
    room.phase === "playing" && room.roundStartedAt
      ? Math.max(0, room.roundDurationMs - (Date.now() - room.roundStartedAt))
      : null;

  return {
    roomID: room.roomID,
    players: Object.values(room.players),
    hostId: room.hostId,
    drawerId: room.drawerId,
    round: room.round,
    maxRounds: room.maxRounds,
    phase: room.phase,
    wordLength: room.word?.length ?? null,
    timeLeftMs,
    language: room.language,
    categories: room.categories,
    availableCategories: WordService.getCategories(room.language),
  };
}
