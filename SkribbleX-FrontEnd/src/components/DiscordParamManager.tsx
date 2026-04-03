"use client";
import { useEffect } from "react";

export default function DiscordParamManager() {
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);

      // Liste der wichtigen Discord-Parameter
      const keys = ["frame_id", "instance_id", "platform", "language"];

      let found = false;
      keys.forEach((key) => {
        const value = params.get(key);
        if (value) {
          sessionStorage.setItem(`discord_${key}`, value);
          found = true;
        }
      });

      if (found) console.log("[Discord] All params anchored in storage");
    }
  }, []);

  return null;
}
