// src/app/layout.tsx
import type { Metadata } from "next";
import Script from "next/script";
import "@/styles/globals.css";
import { ToastProvider } from "@/hooks/ToastContext";
import DiscordParamManager from "@/components/DiscordParamManager";

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
        <Script
          defer
          src="https://umami.sfalter.de/script.js"
          data-website-id="0bc60681-ab72-4c18-913a-5697e427fe82"
          strategy="afterInteractive"
        />
        <DiscordParamManager />
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
