// src/components/GamePage.tsx
"use client";
import { useToast } from "@/hooks/ToastContext";
import { motion } from "framer-motion";
import Player from "./Player";
import styles from "@/styles/GamePage.module.css";

interface GamePageProps {
  roomID: string;
}

export default function GamePage({ roomID }: GamePageProps) {
  // ✅ hooks always at the top — before any logic or early returns
  const { showToast } = useToast();

  const handleCopyRoomID = () => {
    navigator.clipboard.writeText(roomID);
    showToast("success", "Copied!");
  };

  return (
    <div className={styles.gamePage}>
      <div className={styles.gameFrame}>
        <div className={styles.gameTopBar}>
          <span>Round 00 of 99</span>
          <span>_________</span>
          <motion.span
            className={styles.roomID}
            onClick={handleCopyRoomID}
            whileTap={{ scale: 0.85 }}
            transition={{ type: "spring", stiffness: 500, damping: 12 }}
          >
            {roomID}
          </motion.span>
        </div>

        <div className={styles.gamePlayerList}>
          <Player
            isHost
            name="Psydo"
            points={125}
            profilePic="https://media.istockphoto.com/id/517998264/vector/male-user-icon.jpg?s=612x612&w=0&k=20&c=4RMhqIXcJMcFkRJPq6K8h7ozuUoZhPwKniEke6KYa_k="
          />
        </div>

        <canvas className={styles.gameCanvas} />

        <div className={styles.gameGuessChat} />
      </div>
    </div>
  );
}
