// src/components/game/GuessChat.tsx
"use client";
import { useState, useRef, useEffect } from "react";
import { getSocket } from "@/socket";
import styles from "@/styles/GuessChat.module.css";

export interface ChatMessage {
  id: string;
  type: "chat" | "correct" | "system";
  sender?: string;
  text: string;
}

interface GuessChatProps {
  roomID: string;
  phase: string;
  isDrawer: boolean;
  hasGuessed: boolean;
  messages: ChatMessage[];
}

export default function GuessChat({
  roomID,
  phase,
  isDrawer,
  hasGuessed,
  messages,
}: GuessChatProps) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const socket = getSocket();
  const isPlaying = phase === "playing";
  const canGuess = isPlaying && !isDrawer && !hasGuessed;
  const canChat = !isPlaying;

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const submit = () => {
    const text = input.trim();
    if (!text) return;
    setInput("");

    if (canGuess) {
      socket.emit("game:guess", { roomID, guess: text });
      // No local echo — backend broadcasts wrong guesses as room:message
      // and correct guesses trigger game:guess-correct / game:player-guessed
    } else if (canChat) {
      socket.emit("room:message", { roomID, text });
    }
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const placeholder = isDrawer
    ? "You are drawing…"
    : hasGuessed
      ? "You guessed it! 🎉"
      : isPlaying
        ? "Type your guess…"
        : "Chat…";

  return (
    <div className={styles.chatWrap}>
      <div className={styles.messages}>
        {messages.map((m) => (
          <div key={m.id} className={`${styles.msg} ${m.type === "chat" ? styles.chatMsg : styles[m.type]}`}>
            {m.sender && <span className={styles.sender}>{m.sender}: </span>}
            <span className={styles.text}>{m.text}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className={styles.inputRow}>
        <input
          className={styles.input}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKey}
          placeholder={placeholder}
          disabled={isDrawer || hasGuessed}
          maxLength={100}
          autoComplete="off"
        />
        <button
          className={styles.sendBtn}
          onClick={submit}
          disabled={isDrawer || hasGuessed || !input.trim()}
        >
          ↵
        </button>
      </div>
    </div>
  );
}
