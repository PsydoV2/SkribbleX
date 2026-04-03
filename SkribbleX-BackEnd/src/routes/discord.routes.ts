// src/routes/discord.routes.ts
import { Router } from "express";

const router = Router();

/**
 * POST /api/discord/token
 * Exchanges a Discord OAuth2 authorization code for an access token.
 * Called by the frontend Activity after sdk.commands.authorize().
 */
router.post("/discord/token", async (req, res, next) => {
  try {
    const { code } = req.body;

    if (!code) {
      res.status(400).json({ error: "Missing code" });
      return;
    }

    const clientId = process.env.DISCORD_CLIENT_ID;
    const clientSecret = process.env.DISCORD_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.error(
        "[discord/token] DISCORD_CLIENT_ID or DISCORD_CLIENT_SECRET not set",
      );
      res.status(500).json({ error: "Discord credentials not configured" });
      return;
    }

    const response = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code,
        redirect_uri: "https://skribblex.sfalter.de/",
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("[discord/token] Exchange failed:", text);
      res.status(502).json({ error: "Token exchange failed" });
      return;
    }

    const data = await response.json();
    res.json({ access_token: data.access_token });
  } catch (err) {
    next(err);
  }
});

export default router;
