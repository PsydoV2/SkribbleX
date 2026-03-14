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
- **Testing:** Jest (156 tests)

---

## Project Structure

```
SkribbleX-BackEnd/
├── data/
│   └── words.json              # DE + EN, 8 categories, 50-70 words each
├── src/
│   ├── index.ts                # Entry point — HTTP/HTTPS server + Socket.io init
│   ├── events/
│   │   └── room.events.ts      # All Socket.io event handlers
│   ├── services/
│   │   ├── room.service.ts     # In-memory game logic
│   │   └── word.service.ts     # Loads words.json, getRandomWords()
│   ├── types/
│   │   ├── RoomState.ts        # GamePhase, Player, StrokePoint
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
│   ├── room.service.test.ts    # 103 tests
│   ├── room.events.test.ts     # 38 tests
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

```bash
npm test            # run once
npm run test:watch  # watch mode
```

**Test coverage:**

| File                   | Tests | Covers                                         |
| ---------------------- | ----- | ---------------------------------------------- |
| `room.service.test.ts` | 103   | Full game lifecycle, settings, scoring, timers, reconnect, kick, word deduplication |
| `room.events.test.ts`  | 38    | All Socket.io events, broadcasts, error paths  |
| `word.service.test.ts` | 15    | Word loading, categories, fallback, reload     |

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

| Event                    | Direction       | Description                                      |
| ------------------------ | --------------- | ------------------------------------------------ |
| `room:create`            | Client → Server | Create a new room                                |
| `room:join`              | Client → Server | Join with `playerID`, `name`, `avatar`           |
| `room:leave`             | Client → Server | Leave voluntarily                                |
| `room:kick`              | Client → Server | Host kicks a player by `targetSocketId`          |
| `disconnect`             | auto            | Handled via `socketRoomMap`                      |
| `room:player-joined`     | Server → Client | Broadcast when a new player joins                |
| `room:player-rejoined`   | Server → Client | Broadcast when a player reconnects               |
| `room:player-left`       | Server → Client | Broadcast when a player leaves or is kicked      |
| `room:kicked`            | Server → Client | Sent privately to the kicked player              |
| `room:message`           | Client → Server | Chat message (lobby / round-end only)            |
| `room:message`           | Server → Client | Chat message or wrong guess broadcast            |
| `lobby:settings`         | Client → Server | Host changes language / categories / rounds      |
| `lobby:settings-updated` | Server → Client | Broadcast updated settings to all                |

### Game

| Event                    | Direction       | Description                                      |
| ------------------------ | --------------- | ------------------------------------------------ |
| `game:start`             | Client → Server | Host only; min. 2 players required               |
| `game:reset-to-lobby`    | Client → Server | Host resets game back to lobby                   |
| `game:lobby-reset`       | Server → Client | Broadcast after lobby reset                      |
| `game:selecting-word`    | Server → Client | Word selection phase begins                      |
| `game:word-choices`      | Server → Drawer | 3 word options for the drawer                    |
| `game:select-word`       | Client → Server | Drawer picks a word                              |
| `game:round-started`     | Server → Client | Playing phase begins (word length only, no word) |
| `game:word-reveal`       | Server → Drawer | Confirms the chosen word to the drawer           |
| `game:hint-update`       | Server → Client | Progressive letter reveal (3× per round)         |
| `game:guess`             | Client → Server | Guess attempt                                    |
| `game:guess-correct`     | Server → Client | Private — sent to the guesser on correct answer  |
| `game:guess-warm`        | Server → Client | Private — sent when guess is within 2 letters    |
| `game:player-guessed`    | Server → Client | Broadcast (name + updated scores, no word)       |
| `game:round-ended`       | Server → Client | Word revealed to all                             |
| `game:ended`             | Server → Client | Final scoreboard                                 |

### Drawing

| Event              | Direction       | Description                                        |
| ------------------ | --------------- | -------------------------------------------------- |
| `draw:stroke`      | Client → Server | Batched stroke data — drawer only                  |
| `draw:stroke`      | Server → Client | Forwarded stroke data to other players             |
| `draw:clear`       | Client → Server | Clear canvas — drawer only                         |
| `draw:clear`       | Server → Client | Broadcast clear to other players                   |
| `draw:undo`        | Client → Server | Undo last stroke batch — drawer only (Ctrl+Z)      |
| `draw:canvas-sync` | Server → Client | Full stroke history replay (after undo or rejoin)  |
| `draw:fill`        | Client → Server | Flood fill at (x, y) with color — drawer only      |
| `draw:fill`        | Server → Client | Forwarded fill to other players                    |

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
