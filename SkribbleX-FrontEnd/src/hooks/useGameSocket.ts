// src/hooks/useGameSocket.ts
"use client";
import { useEffect, useCallback, useRef } from "react";
import { getSocket } from "@/socket";
import type { PublicRoom, DiscordUser } from "@/types/game";

interface UseGameSocketOptions {
  user: DiscordUser | null;
  roomID: string | null;
  onRoomUpdate: (room: PublicRoom) => void;
  onPlayerJoined: (data: { player: unknown; room: PublicRoom }) => void;
  onPlayerLeft: (data: { socketId: string; room: PublicRoom }) => void;
  onPlayerGuessed: (data: { playerID: string; name: string; room: PublicRoom }) => void;
  onSelectingWord: (data: { room: PublicRoom }) => void;
  onWordChoices: (data: { words: string[] }) => void;
  onRoundStarted: (data: { room: PublicRoom }) => void;
  onWordReveal: (data: { word: string }) => void;
  onRoundEnded: (data: { word: string; room: PublicRoom | null }) => void;
  onGameEnded: (data: { players: unknown[] }) => void;
  onLobbyReset: (data: { room: PublicRoom }) => void;
  onHintUpdate: (data: { hint: string }) => void;
  onKicked: () => void;
  onError: (msg: string) => void;
}

export function useGameSocket(opts: UseGameSocketOptions) {
  const optsRef = useRef(opts);
  optsRef.current = opts;

  // ── Join room once user + roomID are ready ────────────────────────────────
  useEffect(() => {
    const { user, roomID } = opts;
    if (!user || !roomID) return;

    const socket = getSocket();

    const doJoin = () => {
      const { user: u, roomID: r } = optsRef.current;
      if (!u || !r) return;
      socket.emit(
        "room:join",
        { roomID: r, playerID: u.id, name: u.username, avatar: u.avatar },
        (res: { ok: boolean; room?: PublicRoom; reconnected?: boolean; error?: string }) => {
          if (res.ok && res.room) {
            optsRef.current.onRoomUpdate(res.room);
          } else {
            optsRef.current.onError(res.error ?? "Failed to join room");
          }
        },
      );
    };

    doJoin();

    // Re-join automatically on reconnect (e.g. after brief disconnect)
    socket.on("connect", doJoin);
    return () => {
      socket.off("connect", doJoin);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.user?.id, opts.roomID]);

  // ── Persistent event listeners ────────────────────────────────────────────
  useEffect(() => {
    const socket = getSocket();

    type H = (d: unknown) => void;
    const handlers: [string, H][] = [
      ["room:player-joined", (d) => optsRef.current.onPlayerJoined(d as never)],
      ["room:player-left", (d) => optsRef.current.onPlayerLeft(d as never)],
      ["game:player-guessed", (d) => optsRef.current.onPlayerGuessed(d as never)],
      [
        "lobby:settings-updated",
        (d) => optsRef.current.onRoomUpdate((d as { room: PublicRoom }).room),
      ],
      ["game:selecting-word", (d) => optsRef.current.onSelectingWord(d as never)],
      ["game:word-choices", (d) => optsRef.current.onWordChoices(d as never)],
      ["game:round-started", (d) => optsRef.current.onRoundStarted(d as never)],
      ["game:word-reveal", (d) => optsRef.current.onWordReveal(d as never)],
      ["game:round-ended", (d) => optsRef.current.onRoundEnded(d as never)],
      ["game:ended", (d) => optsRef.current.onGameEnded(d as never)],
      ["game:lobby-reset", (d) => optsRef.current.onLobbyReset(d as never)],
      ["game:hint-update", (d) => optsRef.current.onHintUpdate(d as never)],
      ["room:kicked", () => optsRef.current.onKicked()],
    ];

    for (const [event, handler] of handlers) {
      socket.on(event, handler);
    }

    return () => {
      for (const [event, handler] of handlers) {
        socket.off(event, handler);
      }
    };
  }, []);

  // ── Actions ───────────────────────────────────────────────────────────────
  const updateSettings = useCallback(
    (
      roomID: string,
      patch: { language?: string; categories?: string[]; maxRounds?: number },
    ) => {
      const socket = getSocket();
      socket.emit(
        "lobby:settings",
        { roomID, ...patch },
        (res: { ok: boolean; error?: string }) => {
          if (!res.ok)
            optsRef.current.onError(res.error ?? "Settings update failed");
        },
      );
    },
    [],
  );

  const startGame = useCallback((roomID: string) => {
    const socket = getSocket();
    socket.emit(
      "game:start",
      { roomID },
      (res: { ok: boolean; error?: string }) => {
        if (!res.ok)
          optsRef.current.onError(res.error ?? "Could not start game");
      },
    );
  }, []);

  const selectWord = useCallback((roomID: string, word: string) => {
    const socket = getSocket();
    socket.emit(
      "game:select-word",
      { roomID, word },
      (res: { ok: boolean; error?: string }) => {
        if (!res.ok)
          optsRef.current.onError(res.error ?? "Could not select word");
      },
    );
  }, []);

  const leaveRoom = useCallback((roomID: string) => {
    const socket = getSocket();
    socket.emit("room:leave", { roomID });
  }, []);

  const kickPlayer = useCallback((roomID: string, targetSocketId: string) => {
    const socket = getSocket();
    socket.emit(
      "room:kick",
      { roomID, targetSocketId },
      (res: { ok: boolean; error?: string }) => {
        if (!res.ok) optsRef.current.onError(res.error ?? "Could not kick player");
      },
    );
  }, []);

  const resetToLobby = useCallback((roomID: string) => {
    const socket = getSocket();
    socket.emit(
      "game:reset-to-lobby",
      { roomID },
      (res: { ok: boolean; error?: string }) => {
        if (!res.ok)
          optsRef.current.onError(res.error ?? "Could not reset to lobby");
      },
    );
  }, []);

  return { updateSettings, startGame, selectWord, leaveRoom, resetToLobby, kickPlayer };
}
