# SkribbleX — Backend

> Node.js + TypeScript + Socket.io backend for the SkribbleX Discord Activity.

---

## Overview

The SkribbleX backend manages all real-time game logic entirely in memory — no database required. It handles lobbies, rounds, drawing sessions, guesses, and scoring via Socket.io, and is designed to be self-hosted on any VPS or root server behind a reverse proxy.

---

## Tech Stack

- **Runtime:** Node.js >= 18
- **Language:** TypeScript
- **Framework:** Express
- **Real-time:** Socket.io
- **Game state:** In-memory (`Map<string, RoomState>`)
- **Word data:** JSON file (`data/words.json`) — DE + EN, 8 categories, 50-70 words each
- **Env validation:** Zod (`src/config/env.config.ts`)
- **Testing:** Jest (176 tests)
- **Linting/formatting:** ESLint + Prettier

---

## Project Structure

File naming, logging, and the `/api/health` route follow the same conventions as [PsydoV2/TypescriptExpressTemplate](https://github.com/PsydoV2/TypescriptExpressTemplate), so this backend looks and feels consistent with the other Psydo backends.

```
SkribbleX-BackEnd/
├── data/
│   └── words.json                     # DE + EN, 8 categories, 50-70 words each
├── src/
│   ├── index.ts                       # Entry point — HTTP server + Socket.io init
│   ├── config/
│   │   ├── env.config.ts              # Zod-validated environment configuration
│   │   ├── app.config.ts              # Tunable constants (cron schedule, retention rule)
│   │   └── socket.config.ts           # Socket.io setup (initSocket, getIO)
│   ├── controllers/
│   │   ├── discord.controller.ts      # Request/response handling for /api/discord/*
│   │   └── system.controller.ts       # Request/response handling for /api/health
│   ├── events/
│   │   └── room.events.ts             # All Socket.io event handlers
│   ├── helper/
│   │   └── log.helper.ts              # File + console logging by severity
│   ├── jobs/
│   │   └── logRetention.job.ts        # Nightly log archive/cleanup cron job
│   ├── middlewares/
│   │   ├── correlationId.middleware.ts    # Assigns/propagates x-request-id
│   │   ├── requestLogger.middleware.ts    # Logs every request/response
│   │   ├── rateLimiter.middleware.ts
│   │   ├── timeout.middleware.ts          # Aborts requests stuck for 30s
│   │   ├── errorHandler.middleware.ts
│   │   └── notFoundHandler.middleware.ts
│   ├── routes/
│   │   ├── discord.routes.ts
│   │   └── system.routes.ts           # GET /health
│   ├── services/
│   │   ├── room.service.ts            # In-memory game logic
│   │   ├── word.service.ts            # Loads words.json, getRandomWords()
│   │   └── system.service.ts          # Health check aggregation
│   ├── types/
│   │   ├── RoomState.ts               # GamePhase, Player, StrokePoint
│   │   ├── Player.ts
│   │   └── DTOSystemHealth.ts
│   └── utils/
│       ├── httpCodes.util.ts
│       ├── errorCodes.util.ts         # Machine-readable error codes
│       ├── apiError.util.ts           # Typed HTTP error (status + code + message)
│       └── requestContext.util.ts     # AsyncLocalStorage for request IDs
├── tests/
│   ├── __mocks__/
│   │   └── nanoid.ts                  # CJS-compatible mock (nanoid v5 is ESM-only)
│   ├── setup.env.ts                   # Deterministic env vars for tests
│   ├── room.service.test.ts           # 103 tests
│   ├── room.events.test.ts            # 38 tests
│   ├── word.service.test.ts           # 15 tests
│   ├── system.service.test.ts
│   ├── apiError.util.test.ts
│   ├── correlationId.middleware.test.ts
│   ├── errorHandler.middleware.test.ts
│   └── logRetention.job.test.ts
├── eslint.config.js
├── .prettierrc.json
├── jest.config.ts
├── tsconfig.json
└── package.json
```

**File naming convention:** `<name>.<layer>.ts` (e.g. `system.controller.ts`, `rateLimiter.middleware.ts`, `httpCodes.util.ts`); type-only files use `PascalCase.ts` (e.g. `RoomState.ts`, `DTOSystemHealth.ts`).

---

## Logging

`LogHelper` (`src/helper/log.helper.ts`) writes logs by severity (`INFO`, `REQUEST`, `WARNING`, `ERROR`, `CRITICAL`) to `logs/<date>/<severity>.log` — one subdirectory per day, one file per severity — and mirrors every line to the console (`console.info`/`warn`/`error`/`log` depending on severity) so process managers like PM2 pick it up too. The base directory is `LOG_DIR` if set and writable, otherwise a local default (`src/../logs`).

Every request gets a correlation ID (`x-request-id`, taken from the incoming header or generated as a UUID), propagated automatically through the async call chain via `AsyncLocalStorage` (`requestContext.util.ts`) and attached to every log line written while handling that request:

```
2026-08-15T10:23:11.042Z | REQUEST | a3f1b2c4-... | ip=203.0.113.5 | identity=anonymous | /api/discord/token | status=200 | {"code":"[REDACTED]"}
```

Sensitive fields (`password`, `token`, `secret`, `authorization`, `code`) are redacted before a request body is logged.

**Log retention** (`src/jobs/logRetention.job.ts`): a nightly cron job (schedule in `AppConfig.cron.logRetention`, default `0 4 * * *`) looks at the log dir and, per `AppConfig.logRetention.rule` (default: `compressAfterDays: 14`, `deleteAfterDays: 365`):

- once a `<date>/` directory is at least `compressAfterDays` old, all its severity files are packed together into `Archive/<date>.gz` and the original directory is removed
- once an `Archive/<date>.gz` is at least `deleteAfterDays` old, it's deleted

Wired up automatically at startup via `scheduleLogRetention()` in `src/index.ts`.

---

## Error Handling

`ApiError` (`src/utils/apiError.util.ts`) carries an HTTP status and a machine-readable `ErrorCode` (`src/utils/errorCodes.util.ts`), and can be thrown anywhere — room logic, controllers, middlewares. `errorHandler.middleware.ts` turns any `ApiError` into a consistent `{ code, message }` JSON response with the right status code, logs it via `LogHelper` (`WARNING` for an `ApiError`, `CRITICAL` for anything unexpected), and falls back to a generic `500 INTERNAL_ERROR` for non-`ApiError` throws. `notFoundHandler.middleware.ts` answers unmatched routes the same way (`404 NOT_FOUND`). `timeout.middleware.ts` throws a `408 REQUEST_TIMEOUT` `ApiError` if a request hasn't finished after 30s.

`room.service.ts` reuses the same `ApiError`/`ErrorCode` pair for game-logic errors (room not found, wrong phase, not the host, ...); Socket.io event handlers (`room.events.ts`) catch these and forward `error.message` to the client via the ack callback.

---

## API Routes

| Method | Route                | Description                                 |
| ------ | -------------------- | ------------------------------------------- |
| `GET`  | `/api/health`        | System health check (Socket.io, rooms)      |
| `POST` | `/api/discord/token` | Exchanges a Discord OAuth2 code for a token |

`GET /api/health` response shape:

```json
{
  "status": "UP",
  "timestamp": "2026-08-15T10:23:11.042Z",
  "uptimeSeconds": 3600,
  "services": {
    "socket": "healthy"
  },
  "rooms": {
    "active": 4
  }
}
```

Responds `200` when `status` is `"UP"`, `503` when it's `"DOWN"` — so a plain uptime monitor (e.g. Uptime Kuma's default HTTP(s) monitor, which only looks at the status code) detects an outage without needing keyword matching on the body.

---

## Requirements

- Node.js >= 18
- npm >= 9

---

## Installation

```bash
git clone https://github.com/YOURNAME/SkribbleX.git
cd SkribbleX/SkribbleX-BackEnd
npm install
```

---

## Environment Variables

Copy `.env.example` to `.env` and fill in your values. All variables are validated at startup against a Zod schema (`src/config/env.config.ts`) — the process exits with a readable error if anything required is missing or malformed.

| Variable                | Description                                                     |
| ----------------------- | --------------------------------------------------------------- |
| `NODE_ENV`              | `development` \| `test` \| `production` (default `development`) |
| `HTTPPORT`              | HTTP port (default `8444`)                                      |
| `CORS_ORIGIN`           | Allowed CORS origin(s), comma-separated (default `*`)           |
| `LOG_DIR`               | Directory for log files (optional, defaults to `src/../logs`)   |
| `DISCORD_CLIENT_ID`     | Discord application client ID                                   |
| `DISCORD_CLIENT_SECRET` | Discord application client secret                               |
| `DISCORD_REDIRECT_URI`  | OAuth2 redirect URI (default `https://skribblex.sfalter.de/`)   |

The production deployment terminates TLS upstream (reverse proxy / load balancer) — the server itself only ever speaks plain HTTP.

---

## Running the Server

**Development (hot reload):**

```bash
npm run dev
```

**Production:**

```bash
npm run build
npm start
```

The server listens on `http://localhost:8444` by default (see `HTTPPORT`).

---

## Testing

```bash
npm test            # run once
npm run test:watch  # watch mode
npm run lint         # ESLint
npm run lint:fix     # ESLint, auto-fixing what it can
npm run format       # Prettier — write
npm run format:check # Prettier — check only
```

**Test coverage:**

| File                               | Tests | Covers                                                                              |
| ---------------------------------- | ----- | ----------------------------------------------------------------------------------- |
| `room.service.test.ts`             | 103   | Full game lifecycle, settings, scoring, timers, reconnect, kick, word deduplication |
| `room.events.test.ts`              | 38    | All Socket.io events, broadcasts, error paths                                       |
| `word.service.test.ts`             | 15    | Word loading, categories, fallback, reload                                          |
| `system.service.test.ts`           | 2     | Health check status derivation                                                      |
| `apiError.util.test.ts`            | 1     | ApiError shape (status/code/message)                                                |
| `correlationId.middleware.test.ts` | 4     | Request ID propagation, IP fallback                                                 |
| `errorHandler.middleware.test.ts`  | 2     | ApiError vs. generic error responses                                                |
| `logRetention.job.test.ts`         | 11    | Retention planning, archiving, deletion, concurrency guard                          |

---

## Game Flow

```
lobby → wordSelection → playing → (next round) → gameEnd
```

1. **lobby** — Host changes settings; players join/leave.
2. **wordSelection** — Drawer picks from 3 words (15 s timeout → auto-select).
3. **playing** — Drawer draws, guessers guess. Letters revealed at 30% / 55% / 75% of round time.
4. **roundEnd** — Word revealed to all; canvas snapshot shown.
5. **gameEnd** — Final scoreboard displayed.

---

## Socket.io Events

### Room & Lobby

| Event                    | Direction       | Description                                 |
| ------------------------ | --------------- | ------------------------------------------- |
| `room:create`            | Client → Server | Create a new room                           |
| `room:join`              | Client → Server | Join with `playerID`, `name`, `avatar`      |
| `room:leave`             | Client → Server | Leave voluntarily                           |
| `room:kick`              | Client → Server | Host kicks a player by `targetSocketId`     |
| `disconnect`             | auto            | Handled via `socketRoomMap`                 |
| `room:player-joined`     | Server → Client | Broadcast when a new player joins           |
| `room:player-rejoined`   | Server → Client | Broadcast when a player reconnects          |
| `room:player-left`       | Server → Client | Broadcast when a player leaves or is kicked |
| `room:kicked`            | Server → Client | Sent privately to the kicked player         |
| `room:message`           | Client → Server | Chat message (lobby / round-end only)       |
| `room:message`           | Server → Client | Chat message or wrong guess broadcast       |
| `lobby:settings`         | Client → Server | Host changes language / categories / rounds |
| `lobby:settings-updated` | Server → Client | Broadcast updated settings to all           |

### Game

| Event                 | Direction       | Description                                      |
| --------------------- | --------------- | ------------------------------------------------ |
| `game:start`          | Client → Server | Host only; min. 2 players required               |
| `game:reset-to-lobby` | Client → Server | Host resets game back to lobby                   |
| `game:lobby-reset`    | Server → Client | Broadcast after lobby reset                      |
| `game:selecting-word` | Server → Client | Word selection phase begins                      |
| `game:word-choices`   | Server → Drawer | 3 word options for the drawer                    |
| `game:select-word`    | Client → Server | Drawer picks a word                              |
| `game:round-started`  | Server → Client | Playing phase begins (word length only, no word) |
| `game:word-reveal`    | Server → Drawer | Confirms the chosen word to the drawer           |
| `game:hint-update`    | Server → Client | Progressive letter reveal (3× per round)         |
| `game:guess`          | Client → Server | Guess attempt                                    |
| `game:guess-correct`  | Server → Client | Private — sent to the guesser on correct answer  |
| `game:guess-warm`     | Server → Client | Private — sent when guess is within 2 letters    |
| `game:player-guessed` | Server → Client | Broadcast (name + updated scores, no word)       |
| `game:round-ended`    | Server → Client | Word revealed to all                             |
| `game:ended`          | Server → Client | Final scoreboard                                 |

### Drawing

| Event              | Direction       | Description                                       |
| ------------------ | --------------- | ------------------------------------------------- |
| `draw:stroke`      | Client → Server | Batched stroke data — drawer only                 |
| `draw:stroke`      | Server → Client | Forwarded stroke data to other players            |
| `draw:clear`       | Client → Server | Clear canvas — drawer only                        |
| `draw:clear`       | Server → Client | Broadcast clear to other players                  |
| `draw:undo`        | Client → Server | Undo last stroke batch — drawer only (Ctrl+Z)     |
| `draw:canvas-sync` | Server → Client | Full stroke history replay (after undo or rejoin) |
| `draw:fill`        | Client → Server | Flood fill at (x, y) with color — drawer only     |
| `draw:fill`        | Server → Client | Forwarded fill to other players                   |

---

## Word Categories

**German (`de`):** Tiere, Essen & Trinken, Sport, Berufe, Natur, Objekte, Fantasy & Mythologie, Fahrzeuge

**English (`en`):** Animals, Food & Drinks, Sports, Jobs, Nature, Objects, Fantasy & Mythology, Vehicles

50-70 words per category. Already-used words within a game session are excluded from future rounds.

---

## Security Notes

- Guess input is capped at 100 characters
- Player names are trimmed and capped at 32 characters
- Chat messages are capped at 200 characters
- Only the drawer can send `draw:stroke`, `draw:clear`, `draw:undo`, and `draw:fill`
- Only the host can kick players, start the game, or change settings
- The secret word never leaves the server — only `wordLength` is sent to non-drawers
- Rate limiting middleware applied globally

---

## Deployment

**Recommended setup:**

- **Process manager:** PM2 or systemd
- **Reverse proxy:** Caddy or Nginx (WebSocket upgrades required)

Ensure your reverse proxy forwards WebSocket upgrade headers:

```
Connection: Upgrade
Upgrade: websocket
```

**Build for production:**

```bash
npm run build   # compiles TypeScript + copies data/words.json to dist/
```

---

## License

MIT — free to use, modify, and self-host.
