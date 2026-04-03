// src/lib/discord.ts
import type { DiscordUser } from "@/types/game";
import { createAvatar } from "@dicebear/core";
import * as style from "@dicebear/pixel-art";

let sdkPromise: Promise<DiscordUser> | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let discordSdkInstance: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let discordEvents: any = null; // Wird jetzt dynamisch im init befüllt

/** Prüft zuverlässig via Domain, ob die App im Discord-Iframe läuft */
export function isInDiscordActivity(): boolean {
  if (typeof window === "undefined") return false;
  return window.location.hostname.endsWith("discordsays.com");
}

export function getDiscordUser(): Promise<DiscordUser> {
  if (sdkPromise) return sdkPromise;
  sdkPromise = initDiscord();
  return sdkPromise;
}

async function initDiscord(): Promise<DiscordUser> {
  if (typeof window === "undefined") return mockUser();

  // 1. KOMPLETTE Parameter-Rettung
  const params = new URLSearchParams(window.location.search);
  const keys = ["frame_id", "instance_id", "platform", "language"];
  let updated = false;

  keys.forEach((key) => {
    const savedValue = sessionStorage.getItem(`discord_${key}`);
    if (!params.has(key) && savedValue) {
      params.set(key, savedValue);
      updated = true;
    }
  });

  if (updated) {
    const newUrl = window.location.pathname + "?" + params.toString();
    window.history.replaceState({}, "", newUrl);
    console.debug("[discord] All Discord params restored for SDK");
  }

  const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;

  // Validierung: Nur fortfahren, wenn wir wirklich in Discord sind
  if (!clientId || !isInDiscordActivity()) {
    console.warn(
      "[discord] Not in Discord Activity or Client ID missing — using mock",
    );
    return mockUser();
  }

  try {
    const { DiscordSDK, patchUrlMappings, Events } =
      await import("@discord/embedded-app-sdk");

    // Events für Voice-Updates speichern
    discordEvents = Events;

    // WICHTIG: Mappings patchen BEVOR die SDK-Instanz erstellt wird
    patchUrlMappings([
      {
        prefix: "/backend",
        target:
          process.env.NEXT_PUBLIC_BACKEND_HOST ?? "api.skribblex.sfalter.de",
      },
    ]);

    const sdk = new DiscordSDK(clientId);
    discordSdkInstance = sdk;

    await Promise.race([
      sdk.ready(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("SDK ready() timeout")), 8000),
      ),
    ]);

    // 2. Autorisierung (Code anfordern)
    const { code } = await sdk.commands.authorize({
      client_id: clientId,
      response_type: "code",
      state: "",
      prompt: "none",
      scope: ["identify"],
      // Wir casten das Objekt zu 'any', damit TS den Fehler ignoriert,
      // aber die Eigenschaft trotzdem zur Laufzeit gesendet wird.
      redirect_uri: "https://skribblex.sfalter.de/",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    // 3. Token Exchange über dein Backend Proxy (/backend/...)
    const tokenRes = await fetch("/backend/api/discord/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });

    if (!tokenRes.ok) throw new Error("Token exchange failed");
    const { access_token } = await tokenRes.json();

    // 4. Authentifizierung
    await sdk.commands.authenticate({ access_token });

    // 5. Benutzerdaten von Discord API abrufen
    const userRes = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!userRes.ok) throw new Error("Failed to fetch Discord user profile");
    const user = await userRes.json();

    console.log("[discord] Authenticated as:", user.username);

    return {
      id: user.id,
      username: user.global_name ?? user.username,
      discriminator: user.discriminator || "0",
      avatar: user.avatar, // Der Hash für das Profilbild
    };
  } catch (err) {
    console.error("[discord] Initialization failed:", err);
    return mockUser();
  }
}

export function avatarUrl(userId: string, avatarInput: string | null): string {
  // Fall A: Gast-User oder DiceBear (URL oder Data-URI)
  if (
    avatarInput?.startsWith("http") ||
    avatarInput?.startsWith("data:image")
  ) {
    if (avatarInput.includes("dicebear.com") && isInDiscordActivity()) {
      return inlineSvgAvatar(userId);
    }
    return avatarInput;
  }

  // Fall B: Echter Discord Avatar (Hash vorhanden)
  if (avatarInput && userId) {
    const ext = avatarInput.startsWith("a_") ? "gif" : "png";
    return `https://cdn.discordapp.com/avatars/${userId}/${avatarInput}.${ext}?size=128`;
  }

  // Fall C: Default Discord Avatar (Modulo-Rechnung mit BigInt für riesige IDs)
  const defaultIdx = userId ? Number(BigInt(userId) % BigInt(5)) : 0;
  return `https://cdn.discordapp.com/embed/avatars/${defaultIdx}.png`;
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
