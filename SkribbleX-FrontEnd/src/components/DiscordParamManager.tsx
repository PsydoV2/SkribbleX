"use client";
import { useEffect } from "react";

export default function DiscordParamManager() {
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const frameId = params.get("frame_id");
      const instanceId = params.get("instance_id");

      if (frameId) sessionStorage.setItem("discord_frame_id", frameId);
      if (instanceId) sessionStorage.setItem("discord_instance_id", instanceId);

      if (frameId || instanceId) {
        console.log("[Discord] Params anchored in storage");
      }
    }
  }, []);

  return null;
}
