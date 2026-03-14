// src/components/UsernameInput.tsx
"use client";
import { useState, useId } from "react";
import Image from "next/image";
import { guestAvatarUrl } from "@/lib/discord";
import styles from "@/styles/UsernameInput.module.css";

interface UsernameInputProps {
  /** Called when the user confirms their chosen name. Receives the trimmed name. */
  onConfirm: (name: string) => void;
}

/** Shown in browser mode (non-Discord Activity) so guests can pick a display name. */
export default function UsernameInput({ onConfirm }: UsernameInputProps) {
  const [name, setName] = useState("");
  const inputId = useId();

  // A stable seed for the avatar preview — changes as the user types so they
  // see a unique avatar for every name they try.
  const seed = name.trim() || "preview";
  const previewAvatar = guestAvatarUrl(seed);

  const trimmed = name.trim();
  const valid = trimmed.length >= 2 && trimmed.length <= 24;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    onConfirm(trimmed);
  };

  return (
    <div className={styles.root}>
      <div className={styles.logo}>
        <span className={styles.logoText}>Skribble</span>
        <span className={styles.logoX}>X</span>
      </div>

      <form className={styles.card} onSubmit={handleSubmit}>
        <div className={styles.avatarPreview}>
          <Image
            src={previewAvatar}
            alt="Your avatar preview"
            width={72}
            height={72}
            className={styles.avatarImg}
            unoptimized
          />
        </div>

        <p className={styles.hint}>Your avatar is generated from your name</p>

        <label htmlFor={inputId} className={styles.label}>
          Choose a display name
        </label>
        <input
          id={inputId}
          className={styles.input}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. CoolPainter99"
          maxLength={24}
          autoFocus
          autoComplete="off"
          spellCheck={false}
        />

        <button className={styles.confirmBtn} type="submit" disabled={!valid}>
          Play →
        </button>
      </form>
    </div>
  );
}
