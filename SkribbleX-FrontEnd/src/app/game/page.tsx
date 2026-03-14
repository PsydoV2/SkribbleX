// src/app/game/page.tsx
"use client";
import { useEffect, useRef, useState } from "react";
import { getSocket } from "@/socket";
import { getDiscordUser } from "@/lib/discord";
import { socketService } from "@/service/socket.service";
import { useGameSocket } from "@/hooks/useGameSocket";
import { useToast } from "@/hooks/ToastContext";
import ConnectionStatus from "@/components/ConnectionStatus";
import SelectMenu from "@/components/SelectMenu";
import LobbyView from "@/components/lobby/LobbyView";
import GameView from "@/components/game/GameView";
import type { DiscordUser, PublicRoom, Language } from "@/types/game";
import styles from "./game.module.css";

type Screen = "loading" | "select" | "lobby" | "game";

export default function GamePage() {
  const socket = getSocket();
  const { showToast } = useToast();
  const showToastRef = useRef(showToast);
  showToastRef.current = showToast;

  const [screen, setScreen] = useState<Screen>("loading");
  const [isConnected, setIsConnected] = useState(false);
  const [user, setUser] = useState<DiscordUser | null>(null);
  const [room, setRoom] = useState<PublicRoom | null>(null);
  const [socketId, setSocketId] = useState<string>(socket.id ?? "");
  // word-reveal kommt direkt nach round-started — vor GameView mount
  // → hier fangen und als Prop weitergeben
  const [drawerWord, setDrawerWord] = useState<string | null>(null);

  // ── Discord identity ────────────────────────────────────────────────────
  useEffect(() => {
    getDiscordUser()
      .then((u) => {
        setUser(u);
        setScreen("select");
      })
      .catch(() => {
        showToastRef.current("error", "Could not load Discord identity");
        setScreen("select");
      });
  }, []);

  // ── Socket connection state ─────────────────────────────────────────────
  useEffect(() => {
    const onConnect = () => {
      setIsConnected(true);
      setSocketId(socket.id ?? "");
    };
    const onDisconnect = () => setIsConnected(false);
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    if (socket.connected) onConnect();
    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Game socket ─────────────────────────────────────────────────────────
  const inRoom = screen === "lobby" || screen === "game";

  const { updateSettings, startGame, leaveRoom } = useGameSocket({
    user: inRoom ? user : null,
    roomID: inRoom ? (room?.roomID ?? null) : null,
    onRoomUpdate: (r) => setRoom(r),
    onPlayerJoined: ({ room: r }) => setRoom(r),
    onPlayerLeft: ({ room: r }) => setRoom(r),
    onRoundStarted: ({ room: r }) => {
      setDrawerWord(null); // reset for new round
      setRoom(r);
      setScreen("game");
    },
    // Catch word-reveal HERE — GameView may not be mounted yet
    onWordReveal: ({ word }) => setDrawerWord(word),
    onRoundEnded: (d) => {
      if (d.room) setRoom(d.room); // updated scores from backend
      setDrawerWord(null);
    },
    onGameEnded: () => {},
    onError: (msg) => showToastRef.current("error", msg),
  });

  // ── Actions ─────────────────────────────────────────────────────────────
  const emptyRoom = (roomID: string, hostId: string | null): PublicRoom => ({
    roomID,
    players: [],
    hostId,
    drawerId: null,
    round: 0,
    maxRounds: 3,
    phase: "lobby",
    wordLength: null,
    timeLeftMs: null,
    language: "de",
    categories: [],
    availableCategories: [],
  });

  const handleCreateRoom = async () => {
    if (!user) return;
    try {
      const roomID = await socketService.createRoom();
      setRoom(emptyRoom(roomID, socketId));
      setScreen("lobby");
    } catch (err) {
      showToastRef.current(
        "error",
        err instanceof Error ? err.message : String(err),
      );
    }
  };

  const handleJoinRoom = async (roomID: string) => {
    if (!user) return;
    setRoom(emptyRoom(roomID, null));
    setScreen("lobby");
  };

  const handleLeave = () => {
    if (room) leaveRoom(room.roomID);
    setRoom(null);
    setDrawerWord(null);
    setScreen("select");
  };

  return (
    <div className={styles.root}>
      <ConnectionStatus isConnected={isConnected} />

      {screen === "loading" && (
        <div className={styles.loading}>
          <span className={styles.spinner} />
          <p>Connecting to Discord…</p>
        </div>
      )}

      {screen === "select" && (
        <SelectMenu createRoom={handleCreateRoom} joinRoom={handleJoinRoom} />
      )}

      {screen === "lobby" && room && user && (
        <LobbyView
          room={room}
          localUser={user}
          socketId={socketId}
          onUpdateSettings={(patch) =>
            updateSettings(
              room.roomID,
              patch as {
                language?: Language;
                categories?: string[];
                maxRounds?: number;
              },
            )
          }
          onStartGame={() => startGame(room.roomID)}
          onLeave={handleLeave}
        />
      )}

      {screen === "game" && room && user && (
        <GameView
          room={room}
          localUser={user}
          socketId={socketId}
          drawerWord={drawerWord}
          onGameEnd={handleLeave}
        />
      )}
    </div>
  );
}
