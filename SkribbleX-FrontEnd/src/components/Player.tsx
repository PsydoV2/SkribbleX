// src/components/Player.tsx
"use client";
import Image from "next/image";
import styles from "@/styles/Player.module.css";

interface PlayerProps {
  name: string;
  isHost: boolean;
  profilePic: string;
  points: number;
}

export default function Player({ name, isHost, profilePic, points }: PlayerProps) {
  return (
    <div className={styles.player}>
      <Image
        className={styles.playerPic}
        src={profilePic}
        alt={`${name}'s avatar`}
        width={40}
        height={40}
      />
      <div className={styles.playerInfoWrapper}>
        <p>{name}</p>
        <span>{points}</span>
      </div>
      {isHost && <p>👑</p>}
    </div>
  );
}
