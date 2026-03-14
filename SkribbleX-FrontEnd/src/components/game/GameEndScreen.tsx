// src/components/game/GameEndScreen.tsx
"use client";
import { motion } from "framer-motion";
import type { Player } from "@/types/game";
import styles from "@/styles/GameEndScreen.module.css";

interface GameEndScreenProps {
  players: Player[];
  onPlayAgain: () => void;
}

const MEDALS = ["🥇", "🥈", "🥉"];

export default function GameEndScreen({
  players,
  onPlayAgain,
}: GameEndScreenProps) {
  const sorted = [...players].sort((a, b) => b.score - a.score);

  return (
    <motion.div
      className={styles.screen}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        className={styles.card}
        initial={{ scale: 0.9, y: 24 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
      >
        <h1 className={styles.title}>Game Over!</h1>

        <div className={styles.podium}>
          {sorted.map((p, i) => (
            <motion.div
              key={p.playerID}
              className={`${styles.podiumItem} ${i === 0 ? styles.first : ""}`}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <span className={styles.medal}>{MEDALS[i] ?? `#${i + 1}`}</span>
              <span className={styles.podiumName}>{p.name}</span>
              <span className={styles.podiumScore}>{p.score} pts</span>
            </motion.div>
          ))}
        </div>

        <button className={styles.playAgainBtn} onClick={onPlayAgain}>
          Play Again 🎮
        </button>
      </motion.div>
    </motion.div>
  );
}
