// src/lib/discord.ts
import type { DiscordUser } from "@/types/game";
import { createAvatar } from "@dicebear/core";
import * as style from "@dicebear/pixel-art";

let sdkPromise: Promise<DiscordUser> | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let discordSdkInstance: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let discordEvents: any = null;

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
    const { DiscordSDK, patchUrlMappings, Events } =
      await import("@discord/embedded-app-sdk");
    const sdk = new DiscordSDK(clientId);
    discordSdkInstance = sdk;
    discordEvents = Events;

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
  if (avatarInput?.startsWith("http")) {
    // DiceBear is blocked by Discord's CSP — fall back to inline SVG when inside Activity
    if (avatarInput.includes("dicebear.com") && isInDiscordActivity()) {
      return inlineSvgAvatar(userId);
    }
    return avatarInput;
  }
  // Discord avatar hash
  if (avatarInput) {
    const ext = avatarInput.startsWith("a_") ? "gif" : "png";
    return `https://cdn.discordapp.com/avatars/${userId}/${avatarInput}.${ext}?size=64`;
  }
  // Default Discord avatar (index based on userId)
  return `https://cdn.discordapp.com/embed/avatars/${Number(userId) % 5}.png`;
}

/** DiceBear pixel-art avatar — used in browser mode (no CSP restrictions). */
export function guestAvatarUrl(seed: string): string {
  const avatar = createAvatar(style, {
    seed,
    size: 64,
    randomizeIds: true,
    skinColor: ["b68655", "cb9e6e", "e0b687", "eac393", "f5cfa0", "ffdbac"],
  });
  const svg = avatar.toString();
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Deterministic inline SVG avatar (data URI).
 * CSP-safe fallback used when DiceBear is blocked inside Discord Activity.
 */
function inlineSvgAvatar(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  const bg = `hsl(${hue},55%,50%)`;
  const letter = seed.charAt(0).toUpperCase() || "?";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="${bg}"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="32" font-weight="700" fill="white">${letter}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
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
    const channel = await discordSdkInstance.commands.getChannel({
      channel_id: channelId,
    });
    const ids = new Set<string>(
      (channel?.voice_states ?? [])
        .map(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (vs: any) => vs.user?.id as string,
        )
        .filter(Boolean),
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

    const handler = () => {
      getVoiceParticipantIds().then(onUpdate);
    };

    discordSdkInstance.subscribe(discordEvents.VOICE_STATE_UPDATE, handler, {
      channel_id: channelId,
    });

    // Initial fetch
    getVoiceParticipantIds().then(onUpdate);

    return () => {
      try {
        discordSdkInstance.unsubscribe(
          discordEvents.VOICE_STATE_UPDATE,
          handler,
          { channel_id: channelId },
        );
      } catch {
        /* ignore */
      }
    };
  } catch {
    return () => {};
  }
}
