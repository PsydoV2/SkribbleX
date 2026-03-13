// src/lib/discord.ts
// Lazy Discord SDK initializer — only runs in the browser.
// Returns a DiscordUser or a mock when running outside an Activity iframe.

import type { DiscordUser } from "@/types/game";

let sdkPromise: Promise<DiscordUser> | null = null;

export function getDiscordUser(): Promise<DiscordUser> {
  if (sdkPromise) return sdkPromise;

  sdkPromise = (async (): Promise<DiscordUser> => {
    // Outside Discord (local dev) — return a mock identity so the game is
    // still usable without the Activity iframe.
    if (typeof window === "undefined") {
      throw new Error("Discord SDK must run in the browser");
    }

    const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;

    if (!clientId) {
      console.warn(
        "[discord] NEXT_PUBLIC_DISCORD_CLIENT_ID not set — using mock identity",
      );
      return mockUser();
    }

    try {
      // Dynamic import keeps the SDK out of the SSR bundle entirely.
      const { DiscordSDK } = await import("@discord/embedded-app-sdk");
      const sdk = new DiscordSDK(clientId);

      await sdk.ready();

      // Exchange the OAuth2 code for an access token via Discord's proxy.
      const { code } = await sdk.commands.authorize({
        client_id: clientId,
        response_type: "code",
        state: "",
        prompt: "none",
        scope: ["identify"],
      });

      // Your backend (or a simple edge route) must exchange this code for a token.
      // For now we POST to /api/discord/token — add that route when ready.
      const tokenRes = await fetch("/api/discord/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      if (!tokenRes.ok) throw new Error("Token exchange failed");

      const { access_token } = await tokenRes.json();

      await sdk.commands.authenticate({ access_token });

      // Fetch the user from Discord REST.
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
      return mockUser();
    }
  })();

  return sdkPromise;
}

/** Resolves a Discord avatar URL from an id + hash. */
export function avatarUrl(userId: string, avatarHash: string | null): string {
  if (!avatarHash) {
    // Default Discord avatar (index based on last digit of discriminator)
    return `https://cdn.discordapp.com/embed/avatars/${Number(userId) % 5}.png`;
  }
  const ext = avatarHash.startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.${ext}?size=64`;
}

function mockUser(): DiscordUser {
  const id = String(Math.floor(Math.random() * 9000) + 1000);
  return {
    id,
    username: `Player_${id}`,
    discriminator: "0",
    avatar: null,
  };
}
