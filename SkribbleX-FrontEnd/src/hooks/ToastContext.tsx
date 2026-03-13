// src/hooks/ToastContext.tsx
"use client";
import React, { createContext, useContext, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import styles from "@/styles/Toast.module.css";

export type ToastType = "success" | "error" | "info" | "warning";

type Toast = {
  id: number;
  type: ToastType;
  message: string;
  duration: number;
};

export type ToastContextType = {
  showToast: (type: ToastType, message: string, duration?: number) => void;
};

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback(
    (type: ToastType, message: string, duration = 3) => {
      const id = Date.now();
      setToasts((prev) => [...prev, { id, type, message, duration }]);

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration * 1000);
    },
    [],
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      <div className={styles.toastContainer}>
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              className={`${styles.toast} ${styles[t.type]}`}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              {t.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider />");
  return ctx;
};
