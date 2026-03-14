// src/components/lobby/LobbyView.tsx
"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PlayerCard from "./PlayerCard";
import type { PublicRoom, DiscordUser, Language } from "@/types/game";
import styles from "@/styles/LobbyView.module.css";
import { useToast } from "@/hooks/ToastContext";

interface LobbyViewProps {
  room: PublicRoom;
  localUser: DiscordUser;
  socketId: string;
  onUpdateSettings: (patch: {
    language?: Language;
    categories?: string[];
    maxRounds?: number;
  }) => void;
  onStartGame: () => void;
  onLeave: () => void;
}

const LANG_LABELS: Record<Language, string> = {
  de: "🇩🇪 Deutsch",
  en: "🇬🇧 English",
};

export default function LobbyView({
  room,
  localUser,
  socketId,
  onUpdateSettings,
  onStartGame,
  onLeave,
}: LobbyViewProps) {
  const isHost = room.hostId === socketId;
  const playerCount = room.players.length;

  const [lang, setLang] = useState<Language>(room.language);
  const [categories, setCategories] = useState<string[]>(room.categories);
  const [maxRounds, setMaxRounds] = useState<number>(room.maxRounds);

  const canStart = isHost && playerCount >= 2 && categories.length > 0;

  const { showToast } = useToast();

  const toggleCategory = (cat: string) => {
    const next = categories.includes(cat)
      ? categories.filter((c) => c !== cat)
      : [...categories, cat];
    if (next.length === 0) return;
    setCategories(next);
    onUpdateSettings({ categories: next });
  };

  const changeLang = (l: Language) => {
    setLang(l);
    setCategories(room.availableCategories);
    onUpdateSettings({ language: l });
  };

  const changeRounds = (n: number) => {
    setMaxRounds(n);
    onUpdateSettings({ maxRounds: n });
  };

  const pillClass = (active: boolean) =>
    ["pill", active ? "pillActive" : ""].filter(Boolean).join(" ");

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast("success", "Copied!");
    } catch (err) {
      console.error(err);
      showToast("error", "Error while trying to copy!");
    }
  };

  return (
    <div className={styles.lobbyPage}>
      <div className={styles.lobbyFrame}>
        <header className={styles.header}>
          <div className={styles.logo}>
            <span className={styles.logoText}>Skribble</span>
            <span className={styles.logoX}>X</span>
          </div>
          <div className={styles.headerCenter}>
            <span className={styles.roomLabel}>Room</span>
            <span
              className={styles.roomID}
              onClick={() => copyToClipboard(room.roomID)}
            >
              {room.roomID}
            </span>
          </div>
          <button className={styles.leaveBtn} onClick={onLeave}>
            ✕
          </button>
        </header>

        <section className={styles.playersSide}>
          <h3 className={styles.sectionTitle}>
            Players <span className={styles.count}>{playerCount}</span>
          </h3>
          <div className={styles.playerList}>
            <AnimatePresence initial={false}>
              {room.players.map((p) => (
                <motion.div
                  key={p.playerID}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.18 }}
                >
                  <PlayerCard
                    player={p}
                    isHost={room.hostId === p.socketId}
                    isLocalUser={p.playerID === localUser.id}
                    isDrawer={room.drawerId === p.socketId}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
            {playerCount < 2 && (
              <p className={styles.waitingHint}>
                Waiting for at least one more player…
              </p>
            )}
          </div>
        </section>

        <section className={styles.settingsSide}>
          <h3 className={styles.sectionTitle}>Settings</h3>

          <div className={styles.settingBlock}>
            <span className={styles.settingLabel}>Language</span>
            <div className={styles.pills}>
              {(["de", "en"] as Language[]).map((l) => (
                <button
                  key={l}
                  className={pillClass(lang === l)}
                  onClick={() => isHost && changeLang(l)}
                  disabled={!isHost}
                >
                  {LANG_LABELS[l]}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.settingBlock}>
            <span className={styles.settingLabel}>Rounds</span>
            <div className={styles.pills}>
              {[2, 3, 5, 8, 10].map((n) => (
                <button
                  key={n}
                  className={pillClass(maxRounds === n)}
                  onClick={() => isHost && changeRounds(n)}
                  disabled={!isHost}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.settingBlock}>
            <span className={styles.settingLabel}>Categories</span>
            <div className={styles.pills}>
              {room.availableCategories.map((cat) => (
                <button
                  key={cat}
                  className={pillClass(categories.includes(cat))}
                  onClick={() => isHost && toggleCategory(cat)}
                  disabled={!isHost}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {!isHost && (
            <p className={styles.hostNote}>Only the host can change settings</p>
          )}
        </section>

        <footer className={styles.footer}>
          {isHost ? (
            <motion.button
              className={styles.startBtn}
              onClick={onStartGame}
              disabled={!canStart}
              whileHover={canStart ? { scale: 1.03 } : {}}
              whileTap={canStart ? { scale: 0.97 } : {}}
            >
              {canStart
                ? "Start Game 🎮"
                : categories.length === 0
                  ? "Select at least one category"
                  : `Need ${2 - playerCount} more player${2 - playerCount === 1 ? "" : "s"}`}
            </motion.button>
          ) : (
            <p className={styles.waitingForHost}>
              Waiting for the host to start…
            </p>
          )}
        </footer>
      </div>
    </div>
  );
}
