import dotenv from "dotenv";
import { z } from "zod";

// Load .env once, centrally.
dotenv.config();

/**
 * Central, validated and fully typed environment configuration.
 *
 * All `process.env` access goes through the exported `env` object, so missing
 * or malformed variables fail fast at startup (with a readable error) instead
 * of surfacing as `undefined` deep inside the app.
 */
const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  // HTTP / CORS
  HTTPPORT: z.coerce.number().int().positive().default(8444),
  // Comma-separated allowed origins, or "*" to allow any (default — the
  // Discord Activity is served from a discordsays.com subdomain that
  // changes per install, so pin this down in production if possible).
  CORS_ORIGIN: z.string().min(1).default("*"),

  // Logging
  LOG_DIR: z.string().optional(),

  // Discord OAuth2 (see src/controllers/discord.controller.ts)
  DISCORD_CLIENT_ID: z.string().min(1),
  DISCORD_CLIENT_SECRET: z.string().min(1),
  DISCORD_REDIRECT_URI: z
    .string()
    .min(1)
    .default("https://skribblex.sfalter.de/"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
    .join("\n");
  console.error(`❌ Invalid or missing environment variables:\n${issues}`);
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
