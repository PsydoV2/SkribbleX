// src/lib/discord.ts
import type { DiscordUser } from "@/types/game";

let sdkPromise: Promise<DiscordUser> | null = null;

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

  // No client ID → local dev mock
  if (!clientId) {
    console.warn(
      "[discord] NEXT_PUBLIC_DISCORD_CLIENT_ID not set — using mock",
    );
    return mockUser();
  }

  // Only attempt SDK init when we're actually inside the Discord desktop/mobile client.
  // Discord injects a specific query param on the Activity URL.
  const params = new URLSearchParams(window.location.search);
  const isDiscordActivity = params.has("instance_id") || params.has("frame_id");

  if (!isDiscordActivity) {
    console.warn("[discord] Not inside Discord Activity — using mock");
    return mockUser();
  }

  try {
    const { DiscordSDK } = await import("@discord/embedded-app-sdk");
    const sdk = new DiscordSDK(clientId);

    // Timeout so a broken SDK init never freezes the UI
    await Promise.race([
      sdk.ready(),
      timeout(8000, "Discord SDK ready() timed out"),
    ]);

    const { code } = await sdk.commands.authorize({
      client_id: clientId,
      response_type: "code",
      state: "",
      prompt: "none",
      scope: ["identify"],
    });

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "";

    const tokenRes = await fetch(`${backendUrl}/api/discord/token`, {
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
    // Reset so next call retries instead of serving the failed promise
    sdkPromise = null;
    return mockUser();
  }
}

function timeout(ms: number, msg: string): Promise<never> {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error(msg)), ms),
  );
}

export function avatarUrl(userId: string, avatarHash: string | null): string {
  if (!avatarHash) {
    return `https://cdn.discordapp.com/embed/avatars/${Number(userId) % 5}.png`;
  }
  const ext = avatarHash.startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.${ext}?size=64`;
}

function mockUser(): DiscordUser {
  const id = String(Math.floor(Math.random() * 9000) + 1000);
  return { id, username: `Player_${id}`, discriminator: "0", avatar: null };
}
