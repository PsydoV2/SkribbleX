// src/components/SelectMenu.tsx
"use client";
import { useState } from "react";
import OtpInput from "react-otp-input";
import styles from "@/styles/SelectMenu.module.css";

interface SelectMenuProps {
  joinRoom: (roomID: string) => Promise<void>;
  createRoom: () => Promise<void>;
}

export default function SelectMenu({ joinRoom, createRoom }: SelectMenuProps) {
  const [view, setView] = useState<"main" | "join">("main");
  const [roomID, setRoomID] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    if (roomID.length !== 6) {
      setError("Enter a 6-character code");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await joinRoom(roomID.toUpperCase());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Room not found");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    setLoading(true);
    try {
      await createRoom();
    } finally {
      setLoading(false);
    }
  };

  const back = () => {
    setView("main");
    setRoomID("");
    setError("");
  };

  return (
    <div className={styles.root}>
      {/* ── Logo ───────────────────────────────────────────────── */}
      <div className={styles.logo}>
        <span className={styles.logoText}>Skribble</span>
        <span className={styles.logoX}>X</span>
      </div>

      {view === "main" ? (
        <div className={styles.cards}>
          <button
            className={`${styles.card} ${styles.cardCreate}`}
            onClick={handleCreate}
            disabled={loading}
          >
            <span className={styles.cardIcon}>✏️</span>
            <span className={styles.cardTitle}>Create</span>
            <span className={styles.cardDesc}>
              Start a new room and invite friends
            </span>
          </button>

          <div className={styles.divider}>&nbsp;</div>

          <button
            className={`${styles.card} ${styles.cardJoin}`}
            onClick={() => setView("join")}
            disabled={loading}
          >
            <span className={styles.cardIcon}>🚪</span>
            <span className={styles.cardTitle}>Join</span>
            <span className={styles.cardDesc}>
              Enter a 6-character room code
            </span>
          </button>
        </div>
      ) : (
        <div className={styles.joinPanel}>
          <h2 className={styles.joinTitle}>Enter room code</h2>

          <div className={`${styles.otpWrap} ${error ? styles.otpError : ""}`}>
            <OtpInput
              value={roomID.toUpperCase()}
              onChange={(v) => {
                setRoomID(v);
                setError("");
              }}
              numInputs={6}
              inputType="text"
              shouldAutoFocus
              renderInput={(props) => (
                <input
                  {...props}
                  className={`${styles.otpInput} ${roomID.length === 6 ? styles.otpDone : ""}`}
                  name="otpinput"
                />
              )}
            />
          </div>

          {error && <p className={styles.errorMsg}>{error}</p>}

          <div className={styles.joinActions}>
            <button
              className={styles.joinBtn}
              onClick={handleJoin}
              disabled={roomID.length !== 6 || loading}
            >
              {loading ? "Joining…" : "Join Room →"}
            </button>
            <button
              className={styles.backBtn}
              onClick={back}
              disabled={loading}
            >
              Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
