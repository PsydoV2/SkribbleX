/**
 * Jest setup: provide deterministic environment variables before any module
 * (and therefore src/config/env.config.ts) is imported. Values already present in the
 * environment are respected, so CI can still override them.
 */
const defaults: Record<string, string> = {
  NODE_ENV: "test",
  HTTPPORT: "8444",
  CORS_ORIGIN: "*",
  DISCORD_CLIENT_ID: "test-client-id",
  DISCORD_CLIENT_SECRET: "test-client-secret",
};

for (const [key, value] of Object.entries(defaults)) {
  process.env[key] ??= value;
}
