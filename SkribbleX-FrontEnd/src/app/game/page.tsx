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
  const socketRef = useRef<ReturnType<typeof getSocket> | null>(null);
  const getSocketSafe = () => {
    if (!socketRef.current) socketRef.current = getSocket();
    return socketRef.current;
  };
  const { showToast } = useToast();

  const [screen, setScreen] = useState<Screen>("loading");
  const [isConnected, setIsConnected] = useState(false);
  const [user, setUser] = useState<DiscordUser | null>(null);
  const [room, setRoom] = useState<PublicRoom | null>(null);
  const [socketId, setSocketId] = useState<string>("");
  const [drawerWord, setDrawerWord] = useState<string | null>(null);
  const [wordChoices, setWordChoices] = useState<string[] | null>(null);
  const [currentHint, setCurrentHint] = useState<string | null>(null);

  useEffect(() => {
    getDiscordUser()
      .then((u) => {
        setUser(u);
        setScreen("select");
      })
      .catch(() => {
        showToast("error", "Could not load Discord identity");
        setScreen("select");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onConnect = () => {
      setIsConnected(true);
      setSocketId(getSocketSafe().id ?? "");
    };
    const onDisconnect = () => setIsConnected(false);
    const s = getSocketSafe();
    s.on("connect", onConnect);
    s.on("disconnect", onDisconnect);
    if (s.connected) onConnect();
    return () => {
      s.off("connect", onConnect);
      s.off("disconnect", onDisconnect);
    };
  }, []);

  const inRoom = screen === "lobby" || screen === "game";

  const { updateSettings, startGame, selectWord, leaveRoom, resetToLobby } =
    useGameSocket({
      user: inRoom ? user : null,
      roomID: inRoom ? (room?.roomID ?? null) : null,
      onRoomUpdate: (r) => setRoom(r),
      onPlayerJoined: ({ room: r }) => setRoom(r),
      onPlayerLeft: ({ room: r }) => setRoom(r),
      onSelectingWord: ({ room: r }) => {
        // Drawer wählt ein Wort – alle Spieler gehen zum Spiel-Screen
        setDrawerWord(null);
        setWordChoices(null);
        setCurrentHint(null);
        setRoom(r);
        setScreen("game");
      },
      onWordChoices: ({ words }) => {
        // Nur der Drawer empfängt dieses Event
        setWordChoices(words);
      },
      onRoundStarted: ({ room: r }) => {
        // Wort wurde gewählt – Runde startet
        setWordChoices(null);
        setCurrentHint(r.currentHint);
        setRoom(r);
        setScreen("game");
      },
      onWordReveal: ({ word }) => setDrawerWord(word),
      onRoundEnded: (d) => {
        if (d.room) setRoom(d.room);
        setDrawerWord(null);
        setWordChoices(null);
        setCurrentHint(null);
      },
      onGameEnded: () => {}, // GameView handles end screen
      onLobbyReset: ({ room: r }) => {
        setRoom(r);
        setDrawerWord(null);
        setWordChoices(null);
        setCurrentHint(null);
        setScreen("lobby");
      },
      onHintUpdate: ({ hint }) => setCurrentHint(hint),
      onError: (msg) => showToast("error", msg),
    });

  const emptyRoom = (roomID: string, hostId: string | null): PublicRoom => ({
    roomID,
    players: [],
    hostId,
    drawerId: null,
    round: 0,
    maxRounds: 3,
    phase: "lobby",
    wordLength: null,
    currentHint: null,
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
      showToast("error", err instanceof Error ? err.message : String(err));
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
    setWordChoices(null);
    setCurrentHint(null);
    setScreen("select");
  };

  const handleBackLobby = () => {
    if (!room) return;
    const isHost = room.hostId === socketId;
    if (isHost) {
      resetToLobby(room.roomID);
    } else {
      showToast("info", "Waiting for host to return to lobby…");
    }
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
          wordChoices={wordChoices}
          currentHint={currentHint}
          onSelectWord={(word) => selectWord(room.roomID, word)}
          onBackLobby={handleBackLobby}
          onLeave={handleLeave}
        />
      )}
    </div>
  );
}
