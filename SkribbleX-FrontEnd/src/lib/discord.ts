// src/lib/discord.ts
import type { DiscordUser } from "@/types/game";

let sdkPromise: Promise<DiscordUser> | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let discordSdkInstance: any = null;

/** True when the app is running inside a Discord Activity iframe. */
export function isInDiscordActivity(): boolean {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  return params.has("instance_id") || params.has("frame_id");
}

export function getDiscordUser(): Promise<DiscordUser> {
  if (sdkPromise) return sdkPromise;
  sdkPromise = initDiscord();
  return sdkPromise;
}

async function initDiscord(): Promise<DiscordUser> {
  if (typeof window === "undefined") {
    throw new Error("Discord SDK must run in the browser");
  }

  const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;

  if (!clientId) {
    console.warn(
      "[discord] NEXT_PUBLIC_DISCORD_CLIENT_ID not set — using mock",
    );
    return mockUser();
  }

  if (!isInDiscordActivity()) {
    console.warn("[discord] Not inside Discord Activity — using mock");
    return mockUser();
  }

  try {
    const { DiscordSDK, patchUrlMappings } =
      await import("@discord/embedded-app-sdk");
    const sdk = new DiscordSDK(clientId);
    discordSdkInstance = sdk;

    await Promise.race([
      sdk.ready(),
      timeout(8000, "Discord SDK ready() timed out"),
    ]);

    // Patch all fetch/WebSocket/XHR calls so they go through Discord's proxy.
    // The prefix "/backend" must match the URL Mapping in the Developer Portal.
    patchUrlMappings([
      {
        prefix: "/backend",
        target: process.env.NEXT_PUBLIC_BACKEND_HOST ?? "",
      },
    ]);

    const { code } = await sdk.commands.authorize({
      client_id: clientId,
      response_type: "code",
      state: "",
      prompt: "none",
      scope: ["identify"],
    });

    const tokenRes = await fetch("/backend/api/discord/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });

    if (!tokenRes.ok) throw new Error("Token exchange failed");
    const { access_token } = await tokenRes.json();

    await sdk.commands.authenticate({ access_token });

    const userRes = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!userRes.ok) throw new Error("Failed to fetch Discord user");
    const user = await userRes.json();

    return {
      id: user.id,
      username: user.global_name ?? user.username,
      discriminator: user.discriminator,
      avatar: user.avatar,
    };
  } catch (err) {
    console.warn("[discord] SDK init failed, falling back to mock:", err);
    sdkPromise = null;
    return mockUser();
  }
}

function timeout(ms: number, msg: string): Promise<never> {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error(msg)), ms),
  );
}

export function avatarUrl(userId: string, avatarInput: string | null): string {
  // Full URL stored directly (browser/guest users using e.g. DiceBear)
  if (avatarInput?.startsWith("http")) return avatarInput;
  // Discord avatar hash
  if (avatarInput) {
    const ext = avatarInput.startsWith("a_") ? "gif" : "png";
    return `https://cdn.discordapp.com/avatars/${userId}/${avatarInput}.${ext}?size=64`;
  }
  // Default Discord avatar (index based on userId)
  return `https://cdn.discordapp.com/embed/avatars/${Number(userId) % 5}.png`;
}

/** Generate a deterministic DiceBear pixel-art avatar URL for browser guests. */
export function guestAvatarUrl(seed: string): string {
  return `https://api.dicebear.com/9.x/pixel-art/svg?seed=${encodeURIComponent(seed)}`;
}

function mockUser(): DiscordUser {
  const id = String(Math.floor(Math.random() * 9000) + 1000);
  return { id, username: `Player_${id}`, discriminator: "0", avatar: null };
}

/**
 * Returns a set of Discord user IDs currently in the same voice channel.
 * Only works inside a Discord Activity (after getDiscordUser() was called).
 */
export async function getVoiceParticipantIds(): Promise<Set<string>> {
  if (!discordSdkInstance) return new Set();
  try {
    const channelId = discordSdkInstance.channelId;
    if (!channelId) return new Set();
    const channel = await discordSdkInstance.commands.getChannel({ channel_id: channelId });
    const ids = new Set<string>(
      (channel?.voice_states ?? []).map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (vs: any) => vs.user?.id as string,
      ).filter(Boolean),
    );
    return ids;
  } catch {
    return new Set();
  }
}

/**
 * Subscribe to voice state changes in the current channel.
 * Returns an unsubscribe function.
 */
export function subscribeToVoiceUpdates(
  onUpdate: (participantIds: Set<string>) => void,
): () => void {
  if (!discordSdkInstance) return () => {};
  try {
    const channelId = discordSdkInstance.channelId;
    if (!channelId) return () => {};

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { Events } = require("@discord/embedded-app-sdk");

    const handler = () => {
      getVoiceParticipantIds().then(onUpdate);
    };

    discordSdkInstance.subscribe(Events.VOICE_STATE_UPDATE, handler, { channel_id: channelId });

    // Initial fetch
    getVoiceParticipantIds().then(onUpdate);

    return () => {
      try {
        discordSdkInstance.unsubscribe(Events.VOICE_STATE_UPDATE, handler, { channel_id: channelId });
      } catch { /* ignore */ }
    };
  } catch {
    return () => {};
  }
}
