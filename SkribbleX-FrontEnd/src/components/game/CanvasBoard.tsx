// src/components/game/CanvasBoard.tsx
"use client";
import {
  useRef,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import type { StrokePoint, ReceivedStrokePayload } from "@/hooks/useDrawSocket";
import styles from "@/styles/CanvasBoard.module.css";

export type DrawTool = "brush" | "fill";

export interface CanvasBoardHandle {
  clear: () => void;
  applyStrokes: (payload: ReceivedStrokePayload) => void;
  applyFill: (x: number, y: number, color: string) => void;
  replayAll: (batches: StrokePoint[][]) => void;
  snapshot: () => string | null;
}

interface CanvasBoardProps {
  isDrawer: boolean;
  color: string;
  brushSize: number;
  tool: DrawTool;
  onStroke: (strokes: StrokePoint[]) => void;
  onClear: () => void;
  onFill: (x: number, y: number, color: string) => void;
}

function hexToRgba(hex: string): [number, number, number, number] {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return [r, g, b, 255];
}

function floodFill(
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  fillColor: string,
): void {
  const canvas = ctx.canvas;
  const width = canvas.width;
  const height = canvas.height;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  const idx = (x: number, y: number) => (y * width + x) * 4;
  const si = idx(Math.floor(startX), Math.floor(startY));
  const targetR = data[si], targetG = data[si + 1], targetB = data[si + 2], targetA = data[si + 3];

  const [fillR, fillG, fillB, fillA] = hexToRgba(fillColor);

  // If target already matches fill color, nothing to do
  if (targetR === fillR && targetG === fillG && targetB === fillB && targetA === fillA) return;

  const tolerance = 30;
  const matches = (i: number) =>
    Math.abs(data[i] - targetR) <= tolerance &&
    Math.abs(data[i + 1] - targetG) <= tolerance &&
    Math.abs(data[i + 2] - targetB) <= tolerance &&
    Math.abs(data[i + 3] - targetA) <= tolerance;

  const stack: number[] = [Math.floor(startX) + Math.floor(startY) * width];
  const visited = new Uint8Array(width * height);

  while (stack.length) {
    const pos = stack.pop()!;
    if (visited[pos]) continue;
    visited[pos] = 1;

    const x = pos % width;
    const y = (pos - x) / width;
    const i = pos * 4;

    if (!matches(i)) continue;

    data[i] = fillR;
    data[i + 1] = fillG;
    data[i + 2] = fillB;
    data[i + 3] = fillA;

    if (x > 0) stack.push(pos - 1);
    if (x < width - 1) stack.push(pos + 1);
    if (y > 0) stack.push(pos - width);
    if (y < height - 1) stack.push(pos + width);
  }

  ctx.putImageData(imageData, 0, 0);
}

function applyStrokesToCtx(
  ctx: CanvasRenderingContext2D,
  strokes: StrokePoint[],
) {
  if (!strokes.length) return;

  let i = 0;
  while (i < strokes.length) {
    const s = strokes[i];
    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.size;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.beginPath();
    ctx.moveTo(s.x, s.y);

    // Collect consecutive "line" points with same style
    let j = i + 1;
    while (
      j < strokes.length &&
      strokes[j].type === "line" &&
      strokes[j].color === s.color &&
      strokes[j].size === s.size
    ) {
      const prev = strokes[j - 1];
      const curr = strokes[j];
      const mid = { x: (prev.x + curr.x) / 2, y: (prev.y + curr.y) / 2 };
      ctx.quadraticCurveTo(prev.x, prev.y, mid.x, mid.y);
      j++;
    }

    if (j > i + 1) {
      const last = strokes[j - 1];
      ctx.lineTo(last.x, last.y);
    } else {
      // Single dot
      ctx.arc(s.x, s.y, s.size / 2, 0, Math.PI * 2);
      ctx.fillStyle = s.color;
      ctx.fill();
    }

    ctx.stroke();
    i = j;
  }
}

const CanvasBoard = forwardRef<CanvasBoardHandle, CanvasBoardProps>(
  function CanvasBoard({ isDrawer, color, brushSize, tool, onStroke, onFill }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const drawing = useRef(false);
    const pathBuffer = useRef<StrokePoint[]>([]);
    const flushTimer = useRef<ReturnType<typeof setInterval> | null>(null);

    useImperativeHandle(ref, () => ({
      clear() {
        const c = canvasRef.current;
        if (!c) return;
        c.getContext("2d")?.clearRect(0, 0, c.width, c.height);
      },
      applyStrokes(payload: ReceivedStrokePayload) {
        const ctx = canvasRef.current?.getContext("2d");
        if (!ctx) return;
        applyStrokesToCtx(ctx, payload.strokes);
      },
      applyFill(x: number, y: number, fillColor: string) {
        const ctx = canvasRef.current?.getContext("2d");
        if (!ctx) return;
        floodFill(ctx, x, y, fillColor);
      },
      replayAll(batches: StrokePoint[][]) {
        const c = canvasRef.current;
        const ctx = c?.getContext("2d");
        if (!ctx || !c) return;
        ctx.clearRect(0, 0, c.width, c.height);
        for (const batch of batches) {
          applyStrokesToCtx(ctx, batch);
        }
      },
      snapshot() {
        const c = canvasRef.current;
        if (!c) return null;
        return c.toDataURL("image/png");
      },
    }));

    // Resize observer — keeps canvas pixel size = CSS size
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ro = new ResizeObserver(() => {
        const ctx = canvas.getContext("2d");
        const imgData = ctx?.getImageData(0, 0, canvas.width, canvas.height);
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        if (imgData) ctx?.putImageData(imgData, 0, 0);
      });
      ro.observe(canvas);
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      return () => ro.disconnect();
    }, []);

    const getPos = useCallback(
      (e: MouseEvent | Touch): { x: number; y: number } => {
        const rect = canvasRef.current!.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
      },
      [],
    );

    // Flush buffer → send to backend + draw locally
    const flush = useCallback(() => {
      if (!pathBuffer.current.length) return;
      const batch = [...pathBuffer.current];
      // Keep last point for continuity
      pathBuffer.current = [pathBuffer.current[pathBuffer.current.length - 1]];

      // Draw locally
      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) applyStrokesToCtx(ctx, batch);

      // Send to backend
      onStroke(batch);
    }, [onStroke]);

    const startDraw = useCallback(
      (pos: { x: number; y: number }) => {
        if (!isDrawer) return;
        if (tool === "fill") {
          const ctx = canvasRef.current?.getContext("2d");
          if (ctx) floodFill(ctx, pos.x, pos.y, color);
          onFill(pos.x, pos.y, color);
          return;
        }
        drawing.current = true;
        pathBuffer.current = [{ ...pos, color, size: brushSize, type: "move" }];
        flushTimer.current = setInterval(flush, 32); // ~30fps batching
      },
      [isDrawer, color, brushSize, tool, flush, onFill],
    );

    const continueDraw = useCallback(
      (pos: { x: number; y: number }) => {
        if (!isDrawer || !drawing.current) return;
        pathBuffer.current.push({
          ...pos,
          color,
          size: brushSize,
          type: "line",
        });
      },
      [isDrawer, color, brushSize],
    );

    const endDraw = useCallback(() => {
      if (!drawing.current) return;
      drawing.current = false;
      if (flushTimer.current) {
        clearInterval(flushTimer.current);
        flushTimer.current = null;
      }
      flush();
    }, [flush]);

    // Mouse
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const onDown = (e: MouseEvent) => startDraw(getPos(e));
      const onMove = (e: MouseEvent) => continueDraw(getPos(e));
      const onUp = () => endDraw();
      canvas.addEventListener("mousedown", onDown);
      canvas.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
      return () => {
        canvas.removeEventListener("mousedown", onDown);
        canvas.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
    }, [startDraw, continueDraw, endDraw, getPos]);

    // Touch
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const onTouchStart = (e: TouchEvent) => {
        e.preventDefault();
        startDraw(getPos(e.touches[0]));
      };
      const onTouchMove = (e: TouchEvent) => {
        e.preventDefault();
        continueDraw(getPos(e.touches[0]));
      };
      const onTouchEnd = () => endDraw();
      canvas.addEventListener("touchstart", onTouchStart, { passive: false });
      canvas.addEventListener("touchmove", onTouchMove, { passive: false });
      canvas.addEventListener("touchend", onTouchEnd);
      return () => {
        canvas.removeEventListener("touchstart", onTouchStart);
        canvas.removeEventListener("touchmove", onTouchMove);
        canvas.removeEventListener("touchend", onTouchEnd);
      };
    }, [startDraw, continueDraw, endDraw, getPos]);

    return (
      <canvas
        ref={canvasRef}
        className={`${styles.canvas} ${isDrawer ? styles.drawing : styles.watching}`}
      />
    );
  },
);

export default CanvasBoard;
