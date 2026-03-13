# SkribbleX — Backend

> Node.js + TypeScript + Socket.io backend for the SkribbleX Discord Activity.

---

## Overview

The SkribbleX backend manages all real-time game logic entirely in memory — no database required. It handles lobbies, rounds, drawing sessions, guesses, and scoring via Socket.io, and is designed to be self-hosted on any VPS or root server behind a reverse proxy.

---

## Tech Stack

- **Runtime:** Node.js
- **Language:** TypeScript
- **Framework:** Express
- **Real-time:** Socket.io
- **Game state:** In-memory (`Map<string, RoomState>`)
- **Word data:** JSON file (`data/words.json`) — 320 words, 8 categories, DE + EN

---

## Project Structure

```
SkribbleX-BackEnd/
├── data/
│   └── words.json              # 320 words, 8 categories, DE + EN
├── src/
│   ├── index.ts                # Entry point — HTTP/HTTPS server + Socket.io init
│   ├── events/
│   │   └── room.events.ts      # All Socket.io event handlers
│   ├── services/
│   │   ├── room.service.ts     # In-memory game logic
│   │   └── word.service.ts     # Loads words.json, getRandomWord()
│   ├── types/
│   │   ├── RoomState.ts        # GamePhase, language, categories
│   │   └── Player.ts
│   ├── middlewares/
│   │   ├── error.middleware.ts
│   │   └── globalRateLimiter.middleware.ts
│   └── utils/
│       ├── HTTPCodes.ts
│       ├── EnvValidator.ts
│       └── LogHelper.ts
├── tests/
│   ├── __mocks__/
│   │   └── nanoid.ts           # CJS-compatible mock (nanoid v5 is ESM-only)
│   ├── room.service.test.ts    # 71 tests
│   ├── room.events.test.ts     # 37 tests
│   └── word.service.test.ts    # 15 tests
├── jest.config.ts
├── tsconfig.json
└── package.json
```

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

Create a `.env` file in the project root:

```env
NODE_ENV=localhost
HTTPPORT=4000
HTTPSPORT=9444
```

For production (`NODE_ENV=production`), the server expects SSL certificate files in the project root:

```
key.key
fullchain.pem
```

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

The server listens on `http://localhost:4000` in local mode.

---

## Testing

The test suite covers `room.service`, `room.events`, and `word.service` with 123 tests total.

```bash
npm test            # run once
npm run test:watch  # watch mode
```

**Test coverage:**

| File                   | Tests | Covers                                         |
| ---------------------- | ----- | ---------------------------------------------- |
| `room.service.test.ts` | 71    | Full game lifecycle, settings, scoring, timers |
| `room.events.test.ts`  | 37    | All Socket.io events, broadcasts, error paths  |
| `word.service.test.ts` | 15    | Word loading, categories, fallback, reload     |

---

## Socket.io Events

| Event                    | Direction       | Description                                 |
| ------------------------ | --------------- | ------------------------------------------- |
| `room:create`            | Client → Server | Create a new room                           |
| `room:join`              | Client → Server | Join with `playerID` and `name`             |
| `room:leave`             | Client → Server | Leave voluntarily                           |
| `disconnect`             | auto            | Handled via `socketRoomMap`                 |
| `room:player-joined`     | Server → Client | Broadcast to others in room                 |
| `room:player-left`       | Server → Client | Broadcast to others in room                 |
| `room:message`           | Client → Server | Chat message (lobby / roundEnd only)        |
| `room:message`           | Server → Client | Chat message or wrong guess                 |
| `lobby:settings`         | Client → Server | Host changes language / categories / rounds |
| `lobby:settings-updated` | Server → Client | Broadcast updated settings                  |
| `game:start`             | Client → Server | Host only, min. 2 players                   |
| `game:round-started`     | Server → Client | New round (word length only, no word)       |
| `game:word-reveal`       | Server → Client | Sent only to the drawer                     |
| `game:guess`             | Client → Server | Guess attempt                               |
| `game:guess-correct`     | Server → Client | Private — sent to the guesser               |
| `game:player-guessed`    | Server → Client | Broadcast (no word revealed)                |
| `game:round-ended`       | Server → Client | Word is revealed                            |
| `game:ended`             | Server → Client | Final scoreboard                            |
| `draw:stroke`            | Client → Server | Batched stroke data — drawer only           |
| `draw:clear`             | Client → Server | Clear canvas — drawer only                  |

---

## Word Categories

**German (`de`):** Tiere, Essen & Trinken, Sport, Berufe, Natur, Objekte, Fantasy & Mythologie, Fahrzeuge

**English (`en`):** Animals, Food & Drinks, Sports, Jobs, Nature, Objects, Fantasy & Mythology, Vehicles

40 words per category — 320 total. The host selects one or more categories before the game starts.

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

## Security Notes

- Guess input is capped at 100 characters
- Player names are trimmed and capped at 32 characters
- Chat messages are capped at 200 characters
- Only the drawer can send `draw:stroke` and `draw:clear`
- The secret word never leaves the server — only `wordLength` is sent to non-drawers
- The host is the only player who can start the game or change settings

---

## License

MIT — free to use, modify, and self-host.
