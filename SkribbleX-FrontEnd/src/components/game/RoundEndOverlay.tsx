// src/components/game/RoundEndOverlay.tsx
"use client";
import { motion } from "framer-motion";
import type { Player } from "@/types/game";
import styles from "@/styles/RoundEndOverlay.module.css";

interface RoundEndOverlayProps {
  word: string;
  players: Player[];
  round: number;
  maxRounds: number;
  onContinue?: () => void; // only host sees this (optional, auto-advances)
}

export default function RoundEndOverlay({
  word,
  players,
  round,
  maxRounds,
}: RoundEndOverlayProps) {
  const sorted = [...players].sort((a, b) => b.score - a.score);

  return (
    <motion.div
      className={styles.overlay}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className={styles.card}
        initial={{ scale: 0.88, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 22 }}
      >
        <p className={styles.label}>The word was</p>
        <h2 className={styles.word}>{word}</h2>
        <p className={styles.sub}>
          Round {round} of {maxRounds}
        </p>

        <div className={styles.scores}>
          {sorted.map((p, i) => (
            <div key={p.playerID} className={styles.scoreRow}>
              <span className={styles.rank}>#{i + 1}</span>
              <span className={styles.name}>{p.name}</span>
              <span className={styles.pts}>{p.score} pts</span>
            </div>
          ))}
        </div>

        <p className={styles.next}>Next round starting soon…</p>
      </motion.div>
    </motion.div>
  );
}
