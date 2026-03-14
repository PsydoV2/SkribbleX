// src/components/SelectMenu.tsx
"use client";
import { useState } from "react";
import { FaChevronRight } from "react-icons/fa6";
import OtpInput from "react-otp-input";
import styles from "@/styles/SelectMenu.module.css";

interface SelectMenuProps {
  joinRoom: (roomID: string) => Promise<void>;
  createRoom: () => Promise<void>;
}

export default function SelectMenu({ joinRoom, createRoom }: SelectMenuProps) {
  const [showJoinScreen, setShowJoinScreen] = useState(false);
  const [roomID, setRoomID] = useState("");

  return (
    <div className={styles.selectMenuWrapper}>
      {showJoinScreen ? (
        <div className={styles.smJoinCon}>
          <h2>Enter room code</h2>

          <OtpInput
            value={roomID.toUpperCase()}
            onChange={setRoomID}
            numInputs={6}
            renderInput={(inputProps) => (
              <input
                {...inputProps}
                className={`${styles.otpInput} ${
                  roomID.length === 6 ? styles.otpDone : ""
                }`}
              />
            )}
          />

          <button onClick={() => joinRoom(roomID)}>
            <FaChevronRight />
          </button>

          <button onClick={() => setShowJoinScreen(false)}>BACK</button>
        </div>
      ) : (
        <>
          <div className={`${styles.smCon}`} onClick={createRoom}>
            <h2>CREATE</h2>
            <p>Create your own room and share the code with friends</p>
          </div>
          <div
            className={`${styles.smCon}`}
            onClick={() => setShowJoinScreen(true)}
          >
            <h2>JOIN</h2>
            <p>Enter a 6-digit room code to join an existing game</p>
          </div>
        </>
      )}
    </div>
  );
}
