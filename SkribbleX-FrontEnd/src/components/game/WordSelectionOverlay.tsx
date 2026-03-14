// src/components/game/WordSelectionOverlay.tsx
"use client";
import { motion } from "framer-motion";
import styles from "@/styles/WordSelectionOverlay.module.css";

interface WordSelectionOverlayProps {
  words: string[];
  onSelect: (word: string) => void;
}

export default function WordSelectionOverlay({
  words,
  onSelect,
}: WordSelectionOverlayProps) {
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
        <p className={styles.label}>Choose a word to draw</p>
        <div className={styles.wordList}>
          {words.map((word) => (
            <motion.button
              key={word}
              className={styles.wordBtn}
              onClick={() => onSelect(word)}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
            >
              {word}
            </motion.button>
          ))}
        </div>
        <p className={styles.hint}>A random word will be chosen if you wait too long</p>
      </motion.div>
    </motion.div>
  );
}
