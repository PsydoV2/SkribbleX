import { NextFunction, Request, Response } from "express";
import { env } from "../config/env.config";
import { ApiError } from "../utils/apiError.util";
import { ErrorCode } from "../utils/errorCodes.util";
import { HTTPCodes } from "../utils/httpCodes.util";

/**
 * POST /api/discord/token
 * Exchanges a Discord OAuth2 authorization code for an access token.
 * Called by the frontend Activity after sdk.commands.authorize().
 */
export const exchangeToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { code } = req.body;

    if (!code) {
      throw new ApiError(
        HTTPCodes.BadRequest,
        ErrorCode.VALIDATION_ERROR,
        "Missing code",
      );
    }

    const response = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: env.DISCORD_CLIENT_ID,
        client_secret: env.DISCORD_CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: env.DISCORD_REDIRECT_URI,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("[discord/token] Exchange failed:", text);
      throw new ApiError(
        HTTPCodes.BadGateway,
        ErrorCode.DISCORD_AUTH_FAILED,
        "Token exchange failed",
      );
    }

    const data = await response.json();
    res.json({ access_token: data.access_token });
  } catch (err) {
    next(err);
  }
};
