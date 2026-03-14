# **SkribbleX**

<p align="center">
  <img src="./SkribbleX-FrontEnd/public/SkribbleX.png" width="120" alt="SkribbleX Logo"/>
</p>

<h1 align="center">SkribbleX 🎨✏️</h1>
<p align="center">
  A fast, modern and fully free <strong>drawing & guessing multiplayer game</strong> designed as a <strong>Discord Activity</strong> – inspired by skribbl.io but built from scratch.
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#installation">Installation</a> •
  <a href="#development-setup">Development Setup</a> •
  <a href="#discord-setup">Discord Setup</a> •
  <a href="#license">License</a>
</p>

---

## About SkribbleX

**SkribbleX** is a realtime multiplayer drawing & guessing game built as a modern **Discord Activity**.
Players can draw on a shared canvas while others try to guess the secret word.
The project is completely free, open-source and requires only a lightweight backend.

This is **not** skribbl.io — it's a **clean-room reimplementation** with unique UI, features, and code.

---

## Features

- **Realtime drawing** via WebSockets with stroke batching
- **Fill tool** (flood fill) + **Brush** + **Eraser**
- **Undo** (Ctrl+Z) — synced across all clients
- **Guess-the-word gameplay** with word selection phase
- **Progressive letter hints** — revealed at 30%, 55%, 75% of round time
- **"Close guess" feedback** — notifies player when within 2 letters of the answer
- **Live scoreboard** — updates in real-time as players guess correctly
- **Round-end canvas snapshot** — shows the drawing when the word is revealed
- **Automatic lobby per Discord Activity instance**
- **Reconnect support** — rejoin the same game if you lose connection
- **Host controls** — kick players, change settings, start game
- **Discord Voice Sync** — shows who is in voice chat (🎤 badge)
- **Sound effects** — programmatic Web Audio API sounds (no external files)
- **Word categories** — DE + EN, 8 categories, 50-70 words each
- **No repeated words** — already-used words are excluded per game
- **Runs on your own server (zero cost)**

---

## Tech Stack

### **Frontend**

- Next.js 14 (App Router) + TypeScript
- HTML Canvas API (custom drawing engine)
- Framer Motion (overlays & animations)
- `@discord/embedded-app-sdk`
- `socket.io-client`
- CSS Modules

### **Backend**

- Node.js + TypeScript
- Express
- Socket.io
- In-memory game state (no DB needed)
- Jest (156 tests)

### **Infrastructure**

- Self-hosted backend (VPS, root server or Plesk)
- HTTPS reverse proxy recommended (Caddy / Nginx)

---

## Repository Structure

```
SkribbleX/
├── SkribbleX-BackEnd/
│   ├── data/
│   │   └── words.json              # DE + EN, 8 categories, 50-70 words each
│   ├── src/
│   │   ├── index.ts
│   │   ├── events/
│   │   │   └── room.events.ts      # All Socket.io event handlers
│   │   ├── services/
│   │   │   ├── room.service.ts     # In-memory game logic
│   │   │   └── word.service.ts
│   │   └── types/
│   │       ├── RoomState.ts
│   │       └── Player.ts
│   └── tests/                      # 156 Jest tests
└── SkribbleX-FrontEnd/
    └── src/
        ├── app/
        │   └── game/page.tsx       # Main game page
        ├── components/
        │   ├── game/               # GameView, CanvasBoard, Toolbar, GuessChat, …
        │   └── lobby/              # LobbyView, PlayerCard
        ├── hooks/
        │   ├── useGameSocket.ts
        │   └── useDrawSocket.ts
        └── lib/
            ├── sounds.ts           # Web Audio API sound effects
            └── discord.ts          # Discord SDK + voice sync
```

---

## Installation

```sh
git clone https://github.com/DEINUSERNAME/SkribbleX.git
cd SkribbleX
```

---

## Backend Setup

```sh
cd SkribbleX-BackEnd
npm install
npm run build
npm start
```

Create a `.env` in `SkribbleX-BackEnd/`:

```env
NODE_ENV=localhost
HTTPPORT=4000
HTTPSPORT=9444
```

The backend defaults to `http://localhost:4000`.

---

## Frontend Setup

Create a `.env.local` inside `SkribbleX-FrontEnd/`:

```env
NEXT_PUBLIC_DISCORD_CLIENT_ID=123456789012345678
NEXT_PUBLIC_BACKEND_URL=https://your-domain.com
```

Then:

```sh
cd SkribbleX-FrontEnd
npm install
npm run dev
```

Runs on `http://localhost:3000`.

---

## Development Setup

Use two terminals:

**Terminal 1 – Backend**

```sh
cd SkribbleX-BackEnd
npm run dev
```

**Terminal 2 – Frontend**

```sh
cd SkribbleX-FrontEnd
npm run dev
```

---

## Discord Setup

To run SkribbleX as a real Discord Activity:

### 1. Create a new Discord Application

[https://discord.com/developers/applications](https://discord.com/developers/applications)

### 2. Enable **Activities**

In **OAuth2 → Activities**:

- Add your frontend URL (https domain required)
- Allow `embedded-app-sdk`

### 3. Add **Redirects**

In OAuth2 → Redirects:

```
https://your-domain.com/auth/callback
```

### 4. Add Activity URL mapping

```
Activity URL: https://your-domain.com
Entrypoint:   /index.html
```

### 5. Add the Activity to your server

Inside Discord → Activities → Your Game.

---

## Deployment

### Backend:

- Use **PM2**, **Docker**, or a simple systemd service
- Behind reverse proxy:
  - Nginx
  - Caddy (recommended)
  - Plesk Reverse Proxy

### Frontend:

- `npm run build`
- Serve `out/` or `.next/` folder via your preferred static/Node host

### WebSockets:

Ensure your reverse proxy forwards WebSocket upgrades:

```
Connection: upgrade
Upgrade: websocket
```

---

## Contributing

Pull requests welcome!
Open issues for bugs, enhancements, or feature requests.

---

## License

MIT License — free to use, modify, and self-host.

---

## Credits

Made with love for the Discord community.
Inspired by the drawing/guessing genre — rebuilt from scratch as a modern Activity.
