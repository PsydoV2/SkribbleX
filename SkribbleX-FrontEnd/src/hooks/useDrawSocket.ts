// src/hooks/useDrawSocket.ts
"use client";
import { useEffect, useCallback } from "react";
import { getSocket } from "@/socket";

// Backend format: each point carries color + size + type
export interface StrokePoint {
  x: number;
  y: number;
  color: string;
  size: number;
  type: "move" | "line"; // "move" = pen-down, "line" = continue
}

// What we send TO the backend
export interface DrawStrokePayload {
  roomID: string;
  strokes: StrokePoint[];
}

// What the backend broadcasts back (no roomID)
export interface ReceivedStrokePayload {
  strokes: StrokePoint[];
}

interface UseDrawSocketOptions {
  roomID: string;
  isDrawer: boolean;
  onStroke: (payload: ReceivedStrokePayload) => void;
  onClear: () => void;
}

export function useDrawSocket({
  roomID,
  isDrawer,
  onStroke,
  onClear,
}: UseDrawSocketOptions) {
  const socket = getSocket();

  useEffect(() => {
    const handleStroke = (payload: unknown) => {
      const p = payload as ReceivedStrokePayload;
      if (!p?.strokes || !Array.isArray(p.strokes)) return;
      onStroke(p);
    };
    const handleClear = () => onClear();

    socket.on("draw:stroke", handleStroke);
    socket.on("draw:clear", handleClear);
    return () => {
      socket.off("draw:stroke", handleStroke);
      socket.off("draw:clear", handleClear);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendStroke = useCallback(
    (strokes: StrokePoint[]) => {
      if (!isDrawer || strokes.length === 0) return;
      socket.emit("draw:stroke", { roomID, strokes });
    },
    [isDrawer, roomID, socket],
  );

  const sendClear = useCallback(() => {
    if (!isDrawer) return;
    socket.emit("draw:clear", { roomID });
  }, [isDrawer, roomID, socket]);

  return { sendStroke, sendClear };
}
