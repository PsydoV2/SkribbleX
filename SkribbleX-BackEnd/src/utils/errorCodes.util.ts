/**
 * Machine-readable error codes.
 *
 * Defined as an `as const` object (instead of a TypeScript `enum`) so the
 * syntax is fully erasable and produces no extra runtime constructs.
 */
export const ErrorCode = {
  CORS_UNALLOWED: "CORS_UNALLOWED",
  VALIDATION_ERROR: "VALIDATION_ERROR",

  // Rooms / lobby
  ROOM_NOT_FOUND: "ROOM_NOT_FOUND",
  PLAYER_NOT_FOUND: "PLAYER_NOT_FOUND",
  FORBIDDEN: "FORBIDDEN",
  CANNOT_KICK_SELF: "CANNOT_KICK_SELF",
  INVALID_CATEGORIES: "INVALID_CATEGORIES",
  INVALID_MAX_ROUNDS: "INVALID_MAX_ROUNDS",

  // Game flow
  INVALID_GAME_PHASE: "INVALID_GAME_PHASE",
  NOT_ENOUGH_PLAYERS: "NOT_ENOUGH_PLAYERS",
  INVALID_WORD_CHOICE: "INVALID_WORD_CHOICE",

  // Discord OAuth2
  DISCORD_AUTH_FAILED: "DISCORD_AUTH_FAILED",

  // General
  NOT_FOUND: "NOT_FOUND",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  REQUEST_TIMEOUT: "REQUEST_TIMEOUT",
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];
