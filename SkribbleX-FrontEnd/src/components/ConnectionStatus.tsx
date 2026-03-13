// src/components/ConnectionStatus.tsx
"use client";
import styles from "@/styles/StatusWrapper.module.css";

interface StatusProps {
  isConnected: boolean;
}

export default function ConnectionStatus({ isConnected }: StatusProps) {
  return (
    <div className={styles.statusWrapper}>
      <div
        className={`${styles.statusCircle} ${
          isConnected ? styles.connected : styles.disconnected
        }`}
      />
    </div>
  );
}
