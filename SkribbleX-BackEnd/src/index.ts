// index.ts – Entry point of the API (Express + TypeScript)
// Import the validated env first so misconfiguration fails fast at startup.
import { env } from "./config/env.config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import http from "node:http";
import { json } from "body-parser";

import { correlationId } from "./middlewares/correlationId.middleware";
import { requestTimeout } from "./middlewares/timeout.middleware";
import { globalRequestLogger } from "./middlewares/requestLogger.middleware";
import { globalRateLimiter } from "./middlewares/rateLimiter.middleware";
import { errorHandler } from "./middlewares/errorHandler.middleware";
import { notFoundHandler } from "./middlewares/notFoundHandler.middleware";
import { LogHelper, LogSeverity } from "./helper/log.helper";
import { initSocket } from "./config/socket.config";
import { scheduleLogRetention } from "./jobs/logRetention.job";
import { ApiError } from "./utils/apiError.util";
import { ErrorCode } from "./utils/errorCodes.util";
import { HTTPCodes } from "./utils/httpCodes.util";

import discordRoutes from "./routes/discord.routes";
import systemRoutes from "./routes/system.routes";

// A rejected promise with no .catch() is a bug, but the server itself is
// still in a known state, so log it and keep serving requests.
process.on("unhandledRejection", (reason) => {
  void LogHelper.logError("unhandledRejection", reason, LogSeverity.CRITICAL);
});

// An uncaught throw leaves the process in an unknown state — log it and
// exit so the process manager (systemd, Docker, PM2, ...) can restart it.
process.on("uncaughtException", (err) => {
  void LogHelper.logError(
    "uncaughtException",
    err,
    LogSeverity.CRITICAL,
  ).finally(() => process.exit(1));
});

const startServer = async () => {
  const app = express();

  app.set("trust proxy", 1);

  // Correlation ID: must be first so all subsequent logs carry the request ID
  app.use(correlationId);

  app.use(requestTimeout);

  // Security-Header
  app.use(helmet());

  // Comma-separated allowed origins — see CORS_ORIGIN in .env.example.
  // "*" (the default) allows any origin, since the Discord Activity is
  // served from a discordsays.com subdomain that changes per install.
  const allowedOrigins = env.CORS_ORIGIN.split(",");
  app.use(
    cors({
      origin: (origin, callback) => {
        if (
          !origin ||
          allowedOrigins.includes("*") ||
          allowedOrigins.includes(origin)
        ) {
          callback(null, true);
        } else {
          callback(
            new ApiError(
              HTTPCodes.Forbidden,
              ErrorCode.CORS_UNALLOWED,
              "Not allowed by CORS",
            ),
          );
        }
      },
      methods: ["GET", "POST", "OPTIONS"],
      allowedHeaders: ["Authorization", "Content-Type", "x-request-id"],
      credentials: true,
    }),
  );

  // JSON Body Parser — must run before the request logger so req.body is populated
  app.use(json());

  // Request Logger (mirrors every request/response to logs/<date>/request.log)
  app.use(globalRequestLogger);

  // Rate Limiting (kannst du zum Debuggen auskommentieren)
  app.use(globalRateLimiter);

  // --- REST-Routen ---
  app.use("/api", systemRoutes);
  app.use("/api", discordRoutes);

  // Fallbacks
  app.use(notFoundHandler);
  app.use(errorHandler);

  const HTTPPORT = env.HTTPPORT;

  const httpServer = http.createServer(app);
  httpServer.listen(HTTPPORT, "127.0.0.1", () => {
    console.log(`🚀 HTTP running on ${HTTPPORT}`);
  });

  initSocket(httpServer);

  await scheduleLogRetention();

  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received — shutting down gracefully...`);
    httpServer.close(() => {
      process.exit(0);
    });
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
};

void startServer();
