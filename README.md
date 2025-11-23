# 📌 **README.md – SkribbleX**

<p align="center">
  <img src="assets/logo.png" width="120" alt="SkribbleX Logo"/>
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

## 🚀 About SkribbleX

**SkribbleX** is a realtime multiplayer drawing & guessing game built as a modern **Discord Activity**.  
Players can draw on a shared canvas while others try to guess the secret word.  
The project is completely free, open-source and requires only a lightweight backend.

This is **not** skribbl.io — it's a **clean-room reimplementation** with unique UI, features, and code.

---

## ✨ Features

- 🎨 **Realtime drawing** via WebSockets
- 🔤 **Guess-the-word gameplay**
- 👥 **Automatic lobby per Discord Activity instance**
- 🖥️ **Canvas-based multiplayer drawing board**
- 🔄 **Rounds with rotating drawer**
- 🏆 **Scoreboard & live updates**
- 🌙 **Ultra low-latency sync**
- 🔒 **Secure Discord identity via Embedded App SDK**
- 💻 **Runs on your own server (zero cost)**

---

## 🧩 Tech Stack

### **Frontend**

- React + TypeScript
- Vite
- HTML Canvas API
- `@discord/embedded-app-sdk`
- `socket.io-client`

### **Backend**

- Node.js + TypeScript
- Express
- Socket.io
- In-memory game state (no DB needed)

### **Infrastructure**

- Self-hosted backend (VPS, root server or Plesk)
- HTTPS reverse proxy recommended (Caddy / Nginx)

---

## 📸 Screenshots (Demo)

> 🚧 _Coming soon – add your screenshots here:_

- `assets/screenshot_lobby.png`
- `assets/screenshot_canvas.png`
- `assets/screenshot_guess.png`

---

## 📦 Repository Structure

```txt
scribblex/
├─ backend/
│  ├─ src/
│  │  ├─ index.ts
│  │  └─ gameState.ts
│  ├─ package.json
│  └─ tsconfig.json
└─ frontend/
   ├─ src/
   │  ├─ App.tsx
   │  ├─ discord.ts
   │  ├─ components/
   │  │  ├─ CanvasBoard.tsx
   │  │  ├─ GuessInput.tsx
   │  │  └─ PlayerList.tsx
   ├─ package.json
   └─ tsconfig.json
```

---

## 🔧 Installation

### **Clone the repo**

```sh
git clone https://github.com/DEINUSERNAME/SkribbleX.git
cd SkribbleX
```

---

## 🖥️ Backend Setup

```sh
cd backend
npm install
npm run build
npm start
```

The backend defaults to:

```
http://localhost:4000
```

---

## 🎨 Frontend Setup

Create a `.env` inside `frontend/`:

```env
VITE_DISCORD_CLIENT_ID=123456789012345678
VITE_BACKEND_URL=https://your-domain.com
```

Then:

```sh
cd frontend
npm install
npm run dev
```

Runs on:

```
http://localhost:5173
```

---

## 🧰 Development Setup

### Start both services at once (recommended)

Use two terminals:

**Terminal 1 – Backend**

```sh
cd backend
npm run dev
```

**Terminal 2 – Frontend**

```sh
cd frontend
npm run dev
```

---

## 🎮 Discord Setup

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

Example:

```
Activity URL: https://your-domain.com
Entrypoint:   /index.html
```

### 5. Add the Activity to your server

Inside Discord → Activities → Your Game.

---

## 🌍 Deployment

### Backend:

- Use **PM2**, **Docker**, or a simple systemd service
- Behind reverse proxy:

  - Nginx
  - Caddy (empfohlen)
  - Plesk Reverse Proxy

### Frontend:

- `npm run build`
- Serve `dist/` folder via:

  - Nginx
  - Caddy
  - Plesk static hosting

### WebSockets:

Ensure your reverse proxy forwards WebSocket upgrades:

```
Connection: upgrade
Upgrade: websocket
```

---

## 🤝 Contributing

Pull requests welcome!
Open issues for bugs, enhancements, or feature requests.

---

## 📄 License

MIT License — free to use, modify, and self-host.

---

## ❤️ Credits

Made with love for the Discord community.
Inspired by the drawing/guessing genre — rebuilt from scratch as a modern Activity.
