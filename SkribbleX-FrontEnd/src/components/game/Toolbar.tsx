// src/components/game/Toolbar.tsx
"use client";
import type { DrawTool } from "./CanvasBoard";
import styles from "@/styles/Toolbar.module.css";

const COLORS = [
  "#ffffff",
  "#c0c0c0",
  "#808080",
  "#000000",
  "#ff4444",
  "#ff9900",
  "#ffee00",
  "#00cc44",
  "#00bbff",
  "#3355ff",
  "#aa00ff",
  "#ff44aa",
  "#8B4513",
  "#228B22",
  "#008080",
  "#000080",
];

const SIZES = [4, 8, 14, 22, 32];

interface ToolbarProps {
  color: string;
  brushSize: number;
  tool: DrawTool;
  onColor: (c: string) => void;
  onSize: (s: number) => void;
  onTool: (t: DrawTool) => void;
  onClear: () => void;
}

export default function Toolbar({
  color,
  brushSize,
  tool,
  onColor,
  onSize,
  onTool,
  onClear,
}: ToolbarProps) {
  return (
    <div className={styles.toolbar}>
      {/* Color palette */}
      <div className={styles.palette}>
        {COLORS.map((c) => (
          <button
            key={c}
            className={`${styles.swatch} ${c === color ? styles.swatchActive : ""}`}
            style={{ background: c }}
            onClick={() => onColor(c)}
            title={c}
          />
        ))}
      </div>

      <div className={styles.divider} />

      {/* Brush sizes */}
      <div className={styles.sizes}>
        {SIZES.map((s) => (
          <button
            key={s}
            className={`${styles.sizeBtn} ${s === brushSize ? styles.sizeBtnActive : ""}`}
            onClick={() => onSize(s)}
            title={`${s}px`}
          >
            <span
              className={styles.sizeDot}
              style={{ width: s / 2, height: s / 2, background: color }}
            />
          </button>
        ))}
      </div>

      <div className={styles.divider} />

      {/* Tools: Fill */}
      <button
        className={`${styles.toolBtn} ${tool === "fill" ? styles.toolBtnActive : ""}`}
        onClick={() => onTool(tool === "fill" ? "brush" : "fill")}
        title="Fill tool"
      >
        🪣
      </button>

      <div className={styles.divider} />

      {/* Clear */}
      <button
        className={styles.clearBtn}
        onClick={onClear}
        title="Clear canvas"
      >
        🗑
      </button>
    </div>
  );
}
