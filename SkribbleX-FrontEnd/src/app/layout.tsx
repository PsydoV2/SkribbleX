// src/app/layout.tsx
import type { Metadata } from "next";
import "@/styles/globals.css";
import { ToastProvider } from "@/hooks/ToastContext";

export const metadata: Metadata = {
  title: "SkribbleX",
  description: "A fast, modern multiplayer drawing & guessing game.",
  icons: {
    icon: "/SkribbleX.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
