// src/components/game/GameView.tsx
"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { getSocket } from "@/socket";
import { useDrawSocket } from "@/hooks/useDrawSocket";
import CanvasBoard, { type CanvasBoardHandle, type DrawTool } from "./CanvasBoard";
import Toolbar from "./Toolbar";
import GuessChat, { type ChatMessage } from "./GuessChat";
import RoundEndOverlay from "./RoundEndOverlay";
import GameEndScreen from "./GameEndScreen";
import WordSelectionOverlay from "./WordSelectionOverlay";
import PlayerCard from "@/components/lobby/PlayerCard";
import type { PublicRoom, DiscordUser } from "@/types/game";
import {
  playCorrectGuess,
  playOwnCorrectGuess,
  playRoundStart,
  playRoundEnd,
  playTimerTick,
} from "@/lib/sounds";
import styles from "@/styles/GameView.module.css";
import pageStyles from "@/styles/GamePage.module.css";

interface GameViewProps {
  room: PublicRoom;
  localUser: DiscordUser;
  socketId: string;
  drawerWord: string | null;
  wordChoices: string[] | null;
  currentHint: string | null;
  onSelectWord: (word: string) => void;
  onBackLobby: () => void;
  onLeave: () => void;
  voiceParticipantIds?: Set<string>;
}

export default function GameView({
  room,
  localUser,
  socketId,
  drawerWord,
  wordChoices,
  currentHint,
  onSelectWord,
  onBackLobby,
  onLeave,
  voiceParticipantIds = new Set(),
}: GameViewProps) {
  const canvasRef = useRef<CanvasBoardHandle>(null);
  const socket = getSocket();

  const isDrawer = room.drawerId === socketId;
  const localPlayer = room.players.find((p) => p.socketId === socketId);

  const [color, setColor] = useState("#000000");
  const [brushSize, setBrushSize] = useState(8);
  const [tool, setTool] = useState<DrawTool>("brush");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [revealWord, setRevealWord] = useState<string | null>(null);
  const [roundSnapshot, setRoundSnapshot] = useState<string | null>(null);
  const [gameEnded, setGameEnded] = useState(false);
  const [endPlayers, setEndPlayers] = useState(room.players);

  // Timer
  const [timeLeft, setTimeLeft] = useState(room.timeLeftMs ?? 0);
  useEffect(() => {
    if (room.phase !== "playing") return;
    playRoundStart();
    setTimeLeft(room.timeLeftMs ?? 0);
    const id = setInterval(() => {
      setTimeLeft((t) => {
        const next = Math.max(0, t - 1000);
        if (next > 0 && next <= 10_000) playTimerTick();
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [room.phase, room.timeLeftMs]);
  const timeSec = Math.ceil(timeLeft / 1000);

  // Hint for guessers: prefer server-sent hint (with revealed letters),
  // fall back to plain underscores based on word length
  const hint = (() => {
    if (currentHint) {
      // Format: display each char with a space between, keep spaces as separators
      return currentHint
        .split("")
        .map((c) => (c === " " ? "   " : c))
        .join(" ");
    }
    if (room.wordLength) {
      return Array.from({ length: room.wordLength }, () => "_").join(" ");
    }
    return null;
  })();

  const addMessage = useCallback((m: Omit<ChatMessage, "id">) => {
    setMessages((prev) => [...prev, { ...m, id: crypto.randomUUID() }]);
  }, []);

  // Socket listeners
  useEffect(() => {
    const onCorrectGuess = () => {
      playOwnCorrectGuess();
      addMessage({ type: "correct", text: "You guessed it! 🎉" });
    };
    const onPlayerGuessed = (d: { name: string }) => {
      playCorrectGuess();
      addMessage({ type: "system", text: `${d.name} got it!` });
    };
    const onRoundEnded = (d: { word: string }) => {
      playRoundEnd();
      setRoundSnapshot(canvasRef.current?.snapshot() ?? null);
      setRevealWord(d.word);
      canvasRef.current?.clear();
    };
    const onGameEnded = (d: { players: PublicRoom["players"] }) => {
      setEndPlayers(d.players);
      setGameEnded(true);
    };
    const onChatMsg = (d: {
      name?: string;
      playerID?: string;
      text: string;
      type?: string;
    }) => addMessage({ type: "chat", sender: d.name, text: d.text });

    socket.on("game:guess-correct", onCorrectGuess);
    socket.on("game:player-guessed", onPlayerGuessed);
    socket.on("game:round-ended", onRoundEnded);
    socket.on("game:ended", onGameEnded);
    socket.on("room:message", onChatMsg);
    return () => {
      socket.off("game:guess-correct", onCorrectGuess);
      socket.off("game:player-guessed", onPlayerGuessed);
      socket.off("game:round-ended", onRoundEnded);
      socket.off("game:ended", onGameEnded);
      socket.off("room:message", onChatMsg);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-dismiss round-end overlay
  useEffect(() => {
    if (!revealWord) return;
    const id = setTimeout(() => {
      setRevealWord(null);
      setRoundSnapshot(null);
    }, 4000);
    return () => clearTimeout(id);
  }, [revealWord]);

  // Draw socket — backend format: { strokes: StrokePoint[] }
  const { sendStroke, sendClear, sendFill, sendUndo } = useDrawSocket({
    roomID: room.roomID,
    isDrawer,
    onStroke: (payload) => canvasRef.current?.applyStrokes(payload),
    onClear: () => canvasRef.current?.clear(),
    onFill: ({ x, y, color: c }) => canvasRef.current?.applyFill(x, y, c),
    onCanvasSync: ({ strokes }) => canvasRef.current?.replayAll(strokes),
  });

  // Ctrl+Z → Undo (only for drawer)
  useEffect(() => {
    if (!isDrawer || room.phase !== "playing") return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        sendUndo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isDrawer, room.phase, sendUndo]);

  const handleClear = () => {
    canvasRef.current?.clear();
    sendClear();
  };

  const sorted = [...room.players].sort((a, b) => b.score - a.score);

  if (gameEnded) {
    return (
      <GameEndScreen
        players={endPlayers}
        onBackLobby={onBackLobby}
        onLeave={onLeave}
      />
    );
  }

  // Active categories label (shown to all players)
  const categoriesLabel = room.categories.join(", ");

  return (
    <div className={pageStyles.gamePage}>
      <div className={pageStyles.gameFrame}>
        {/* ── Top bar ──────────────────────────────────────────── */}
        <div className={pageStyles.gameTopBar}>
          <span>
            Round {room.round} / {room.maxRounds}
          </span>

          <span className={styles.wordArea}>
            {room.phase === "wordSelection" ? (
              <em className={styles.drawingLabel}>
                {isDrawer ? "Choose a word…" : "Drawer is picking a word…"}
              </em>
            ) : isDrawer && drawerWord ? (
              <>
                <em className={styles.drawingLabel}>Draw: </em>
                <strong>{drawerWord}</strong>
              </>
            ) : (
              (hint ?? "…")
            )}
          </span>

          <span
            className={`${styles.timer} ${timeSec <= 10 && room.phase === "playing" ? styles.timerWarn : ""}`}
          >
            {room.phase === "playing" ? `${timeSec}s` : ""}
          </span>
        </div>

        {/* ── Left: players ────────────────────────────────────── */}
        <div className={pageStyles.gamePlayerList}>
          <div className={styles.categoryBadge}>{categoriesLabel}</div>
          {sorted.map((p) => (
            <PlayerCard
              key={p.playerID}
              player={p}
              isHost={room.hostId === p.socketId}
              isLocalUser={p.playerID === localUser.id}
              isDrawer={room.drawerId === p.socketId}
              isInVoice={voiceParticipantIds.has(p.playerID)}
            />
          ))}
        </div>

        {/* ── Center: canvas + toolbar ─────────────────────────── */}
        <div className={styles.canvasCol}>
          <CanvasBoard
            ref={canvasRef}
            isDrawer={isDrawer && room.phase === "playing"}
            color={color}
            brushSize={brushSize}
            tool={tool}
            onStroke={sendStroke}
            onClear={sendClear}
            onFill={sendFill}
          />
          {isDrawer && room.phase === "playing" && (
            <Toolbar
              color={color}
              brushSize={brushSize}
              tool={tool}
              onColor={(c) => { setColor(c); setTool("brush"); }}
              onSize={(s) => { setBrushSize(s); setTool("brush"); }}
              onTool={setTool}
              onClear={handleClear}
            />
          )}
        </div>

        {/* ── Right: guess chat ─────────────────────────────────── */}
        <div className={pageStyles.gameGuessChat}>
          <GuessChat
            roomID={room.roomID}
            phase={room.phase}
            isDrawer={isDrawer}
            hasGuessed={localPlayer?.hasGuessed ?? false}
            messages={messages}
          />
        </div>
      </div>

      {/* ── Overlays ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {room.phase === "wordSelection" && isDrawer && wordChoices && (
          <WordSelectionOverlay
            key="wordSelection"
            words={wordChoices}
            onSelect={onSelectWord}
          />
        )}
        {revealWord && (
          <RoundEndOverlay
            key="roundEnd"
            word={revealWord}
            players={room.players}
            round={room.round}
            maxRounds={room.maxRounds}
            snapshot={roundSnapshot}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
