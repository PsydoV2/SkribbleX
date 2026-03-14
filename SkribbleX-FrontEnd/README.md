# SkribbleX — Frontend

> Next.js + TypeScript frontend for the SkribbleX Discord Activity.

---

## Overview

The SkribbleX frontend is a Next.js application that runs as a **Discord Activity** (embedded inside Discord voice channels) or standalone in the browser. It communicates with the backend via Socket.io for all real-time game events.

---

## Tech Stack

- **Framework:** Next.js 14 (App Router) + TypeScript
- **Drawing:** HTML Canvas API (custom engine — no canvas library)
- **Animations:** Framer Motion
- **Real-time:** socket.io-client
- **Discord:** `@discord/embedded-app-sdk`
- **Styling:** CSS Modules
- **Sounds:** Web Audio API (programmatic, no external audio files)

---

## Project Structure

```
src/
├── app/
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Entry point (Discord auth / browser fallback)
│   ├── game/
│   │   └── page.tsx            # Main game page — orchestrates all state
│   ├── privacy/page.tsx
│   └── tos/page.tsx
├── components/
│   ├── game/
│   │   ├── CanvasBoard.tsx     # Drawing canvas (brush, fill, eraser, undo)
│   │   ├── Toolbar.tsx         # Color picker, brush size, tool selector, clear
│   │   ├── GuessChat.tsx       # Chat + guess input
│   │   ├── GameView.tsx        # Full game layout (canvas + players + chat)
│   │   ├── GameEndScreen.tsx   # Final scoreboard
│   │   ├── RoundEndOverlay.tsx # Word reveal + canvas snapshot
│   │   └── WordSelectionOverlay.tsx  # Drawer picks from 3 words
│   ├── lobby/
│   │   ├── LobbyView.tsx       # Lobby UI (settings, player list)
│   │   └── PlayerCard.tsx      # Player avatar, score, badges (host/drawer/voice)
│   ├── ConnectionStatus.tsx
│   ├── SelectMenu.tsx
│   └── UsernameInput.tsx
├── hooks/
│   ├── useGameSocket.ts        # All game Socket.io events + actions
│   ├── useDrawSocket.ts        # Drawing Socket.io events + actions
│   └── ToastContext.tsx
├── lib/
│   ├── sounds.ts               # Web Audio API sound effects
│   └── discord.ts              # Discord SDK init + voice state subscription
├── styles/                     # CSS Modules
└── types/
    └── game.ts                 # PublicRoom, DiscordUser, GamePhase, …
```

---

## Requirements

- Node.js >= 18
- npm >= 9
- A running [SkribbleX backend](../SkribbleX-BackEnd/README.md)

---

## Installation

```bash
cd SkribbleX-FrontEnd
npm install
```

---

## Environment Variables

Create a `.env.local` in `SkribbleX-FrontEnd/`:

```env
NEXT_PUBLIC_DISCORD_CLIENT_ID=123456789012345678
NEXT_PUBLIC_BACKEND_URL=https://your-domain.com
```

---

## Development

```bash
npm run dev
```

Runs on `http://localhost:3000`.

---

## Production Build

```bash
npm run build
npm start
```

---

## Key Features

### Drawing Tools

- **Brush** — freehand drawing with configurable color and size
- **Eraser** — erases with configurable size
- **Fill** — flood fill (BFS, tolerance 30) synced to all clients
- **Undo** (Ctrl+Z) — removes last stroke batch; backend replays full history to all clients
- **Clear** — clears canvas for all players

### Game Flow

1. **Lobby** — host configures language, categories, round count; players join
2. **Word Selection** — drawer picks from 3 words (15 s timeout → auto-select)
3. **Playing** — drawer draws, guessers type; letters progressively revealed
4. **Round End** — word revealed, canvas snapshot shown for 4 seconds
5. **Game End** — final scoreboard with back-to-lobby / leave options

### Scoring & Hints

- Live scores update in real-time as players guess
- "Close guess" notification when within 2 letters of the answer
- Progressive hint: letters revealed at 30%, 55%, 75% of round time

### Discord Integration

- Auth via `@discord/embedded-app-sdk` — user identity from Discord
- Voice state subscription — 🎤 badge on players currently in voice channel
- Falls back to browser mode (username input) when not inside Discord

### Reconnect

- Players reconnect to the same game automatically using their `playerID`
- Canvas state is replayed from backend stroke history on reconnect

---

## Socket Events (Client Side)

All Socket.io communication is handled in:

- [`src/hooks/useGameSocket.ts`](src/hooks/useGameSocket.ts) — lobby, game, chat events
- [`src/hooks/useDrawSocket.ts`](src/hooks/useDrawSocket.ts) — draw:stroke, draw:fill, draw:undo, draw:canvas-sync

See the [backend README](../SkribbleX-BackEnd/README.md#socketio-events) for the full event reference.

---

## License

MIT — free to use, modify, and self-host.
