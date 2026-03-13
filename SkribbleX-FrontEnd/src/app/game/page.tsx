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
import type { DiscordUser, PublicRoom, Language } from "@/types/game";
import styles from "./game.module.css";

type Screen = "loading" | "select" | "lobby" | "game";

export default function GamePage() {
  const socket = getSocket();
  const { showToast } = useToast();
  // Stable ref — effects that close over showToast won't re-run on every render
  const showToastRef = useRef(showToast);
  showToastRef.current = showToast;

  const [screen, setScreen] = useState<Screen>("loading");
  const [isConnected, setIsConnected] = useState(false);
  const [user, setUser] = useState<DiscordUser | null>(null);
  const [room, setRoom] = useState<PublicRoom | null>(null);
  const [socketId, setSocketId] = useState<string>(socket.id ?? "");

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

    // Use the callback — never setState synchronously in the effect body
    if (socket.connected) onConnect();

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
    // socket is a stable singleton — [] is intentional
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Game socket events ──────────────────────────────────────────────────
  // Pass roomID as null until we're actually in a room, so the hook
  // doesn't try to join before the user has chosen/created one.
  const inRoom = screen === "lobby" || screen === "game";

  const { updateSettings, startGame, leaveRoom } = useGameSocket({
    user: inRoom ? user : null,
    roomID: inRoom ? (room?.roomID ?? null) : null,
    onRoomUpdate: (r) => setRoom(r),
    onPlayerJoined: ({ room: r }) => setRoom(r),
    onPlayerLeft: ({ room: r }) => setRoom(r),
    onRoundStarted: ({ room: r }) => {
      setRoom(r);
      setScreen("game");
    },
    onWordReveal: () => {}, // handled inside GameView (next step)
    onRoundEnded: () => {},
    onGameEnded: () => {},
    onError: (msg) => showToastRef.current("error", msg),
  });

  // ── Actions ─────────────────────────────────────────────────────────────
  const handleCreateRoom = async () => {
    if (!user) return;
    try {
      const roomID = await socketService.createRoom();
      // The hook will emit room:join once roomID + user are set.
      // We pre-populate a minimal room so the lobby renders immediately.
      setRoom({
        roomID,
        players: [],
        hostId: socketId,
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
    setRoom({
      roomID,
      players: [],
      hostId: null,
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
    setScreen("lobby");
    // useGameSocket will call room:join and fill real room data via onRoomUpdate
  };

  const handleLeave = () => {
    if (room) leaveRoom(room.roomID);
    setRoom(null);
    setScreen("select");
  };

  // ── Render ───────────────────────────────────────────────────────────────
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

      {screen === "game" && room && (
        <div className={styles.gamePlaceholder}>
          {/* GameView kommt im nächsten Schritt */}
          <p>🎮 Round {room.round} – Game is running…</p>
        </div>
      )}
    </div>
  );
}
