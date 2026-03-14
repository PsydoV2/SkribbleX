// src/components/lobby/PlayerCard.tsx
"use client";
import Image from "next/image";
import { avatarUrl } from "@/lib/discord";
import type { Player } from "@/types/game";
import styles from "@/styles/PlayerCard.module.css";

interface PlayerCardProps {
  player: Player;
  isHost: boolean;
  isLocalUser: boolean;
  isDrawer: boolean;
  isInVoice?: boolean;
  onKick?: () => void;
}

export default function PlayerCard({
  player,
  isHost,
  isLocalUser,
  isDrawer,
  isInVoice = false,
  onKick,
}: PlayerCardProps) {
  const avatar = avatarUrl(player.playerID, player.avatar);

  return (
    <div
      className={`${styles.card} ${isLocalUser ? styles.self : ""} ${
        isDrawer ? styles.drawer : ""
      }`}
    >
      <div className={styles.avatarWrap}>
        <Image
          src={avatar}
          alt={player.name}
          width={36}
          height={36}
          className={styles.avatar}
          unoptimized // Discord CDN already serves optimised sizes
        />
        {isHost && (
          <span className={styles.badge} title="Host">
            👑
          </span>
        )}
        {isDrawer && (
          <span className={styles.badge} title="Drawing">
            ✏️
          </span>
        )}
      </div>

      <div className={styles.info}>
        <span className={styles.name}>
          {player.name}
          {isLocalUser && <em className={styles.you}> (you)</em>}
        </span>
        <span className={styles.score}>{player.score} pts</span>
      </div>

      {player.hasGuessed && <span className={styles.guessed}>✓</span>}
      {isInVoice && (
        <span className={styles.voiceBadge} title="In voice channel">
          🎤
        </span>
      )}
      {onKick && (
        <button className={styles.kickBtn} onClick={onKick} title="Kick player">
          ✕
        </button>
      )}
    </div>
  );
}
