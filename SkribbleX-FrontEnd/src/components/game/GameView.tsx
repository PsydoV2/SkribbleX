// src/components/game/GameView.tsx
"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { getSocket } from "@/socket";
import { useDrawSocket } from "@/hooks/useDrawSocket";
import CanvasBoard, { type CanvasBoardHandle } from "./CanvasBoard";
import Toolbar from "./Toolbar";
import GuessChat, { type ChatMessage } from "./GuessChat";
import RoundEndOverlay from "./RoundEndOverlay";
import GameEndScreen from "./GameEndScreen";
import PlayerCard from "@/components/lobby/PlayerCard";
import type { PublicRoom, DiscordUser } from "@/types/game";
import styles from "@/styles/GameView.module.css";
import pageStyles from "@/styles/GamePage.module.css";

interface GameViewProps {
  room: PublicRoom;
  localUser: DiscordUser;
  socketId: string;
  drawerWord: string | null; // set by page.tsx from word-reveal event
  onGameEnd: () => void;
}

export default function GameView({
  room,
  localUser,
  socketId,
  drawerWord,
  onGameEnd,
}: GameViewProps) {
  const canvasRef = useRef<CanvasBoardHandle>(null);
  const socket = getSocket();

  const isDrawer = room.drawerId === socketId;
  const localPlayer = room.players.find((p) => p.socketId === socketId);

  const [color, setColor] = useState("#000000");
  const [brushSize, setBrushSize] = useState(8);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [revealWord, setRevealWord] = useState<string | null>(null);
  const [gameEnded, setGameEnded] = useState(false);
  const [endPlayers, setEndPlayers] = useState(room.players);

  // Timer
  const [timeLeft, setTimeLeft] = useState(room.timeLeftMs ?? 0);
  useEffect(() => {
    if (room.phase !== "playing") return;
    setTimeLeft(room.timeLeftMs ?? 0);
    const id = setInterval(
      () => setTimeLeft((t) => Math.max(0, t - 1000)),
      1000,
    );
    return () => clearInterval(id);
  }, [room.phase, room.timeLeftMs]);
  const timeSec = Math.ceil(timeLeft / 1000);

  // Hint for guessers
  const hint = room.wordLength
    ? Array.from({ length: room.wordLength }, () => "_").join(" ")
    : null;

  const addMessage = useCallback((m: Omit<ChatMessage, "id">) => {
    setMessages((prev) => [...prev, { ...m, id: crypto.randomUUID() }]);
  }, []);

  // Socket listeners
  useEffect(() => {
    const onCorrectGuess = (d: { playerName: string }) =>
      addMessage({ type: "correct", text: `${d.playerName} guessed it! 🎉` });
    const onPlayerGuessed = (d: { playerName: string }) =>
      addMessage({ type: "system", text: `${d.playerName} got it!` });
    const onRoundEnded = (d: { word: string }) => {
      setRevealWord(d.word);
      canvasRef.current?.clear();
    };
    const onGameEnded = (d: { players: PublicRoom["players"] }) => {
      setEndPlayers(d.players);
      setGameEnded(true);
    };
    const onChatMsg = (d: { sender: string; text: string }) =>
      addMessage({ type: "chat", sender: d.sender, text: d.text });

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
    const id = setTimeout(() => setRevealWord(null), 4000);
    return () => clearTimeout(id);
  }, [revealWord]);

  // Draw socket — backend format: { strokes: StrokePoint[] }
  const { sendStroke, sendClear } = useDrawSocket({
    roomID: room.roomID,
    isDrawer,
    onStroke: (payload) => canvasRef.current?.applyStrokes(payload),
    onClear: () => canvasRef.current?.clear(),
  });

  const handleClear = () => {
    canvasRef.current?.clear();
    sendClear();
  };

  const sorted = [...room.players].sort((a, b) => b.score - a.score);

  if (gameEnded) {
    return <GameEndScreen players={endPlayers} onPlayAgain={onGameEnd} />;
  }

  return (
    <div className={pageStyles.gamePage}>
      <div className={pageStyles.gameFrame}>
        {/* ── Top bar ──────────────────────────────────────────── */}
        <div className={pageStyles.gameTopBar}>
          <span>
            Round {room.round} / {room.maxRounds}
          </span>

          <span className={styles.wordArea}>
            {isDrawer && drawerWord ? (
              <>
                <em className={styles.drawingLabel}>Draw: </em>
                <strong>{drawerWord}</strong>
              </>
            ) : (
              (hint ?? "…")
            )}
          </span>

          <span
            className={`${styles.timer} ${timeSec <= 10 ? styles.timerWarn : ""}`}
          >
            {timeSec}s
          </span>
        </div>

        {/* ── Left: players ────────────────────────────────────── */}
        <div className={pageStyles.gamePlayerList}>
          {sorted.map((p) => (
            <PlayerCard
              key={p.playerID}
              player={p}
              isHost={room.hostId === p.socketId}
              isLocalUser={p.playerID === localUser.id}
              isDrawer={room.drawerId === p.socketId}
            />
          ))}
        </div>

        {/* ── Center: canvas + toolbar ─────────────────────────── */}
        <div className={styles.canvasCol}>
          <CanvasBoard
            ref={canvasRef}
            isDrawer={isDrawer}
            color={color}
            brushSize={brushSize}
            onStroke={sendStroke}
            onClear={sendClear}
          />
          {isDrawer && (
            <Toolbar
              color={color}
              brushSize={brushSize}
              onColor={setColor}
              onSize={setBrushSize}
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
            localPlayer={localPlayer}
            hasGuessed={localPlayer?.hasGuessed ?? false}
            messages={messages}
            onMessage={addMessage}
          />
        </div>
      </div>

      <AnimatePresence>
        {revealWord && (
          <RoundEndOverlay
            key="roundEnd"
            word={revealWord}
            players={room.players}
            round={room.round}
            maxRounds={room.maxRounds}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
