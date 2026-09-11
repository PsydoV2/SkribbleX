// index.ts – Entry point of the API (Express + TypeScript)
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import https from "https";
import http from "http";
import { json } from "body-parser";

import { correlationId } from "./middlewares/correlationId.middleware";
import { globalRequestLogger } from "./middlewares/requestLogger.middleware";
import { globalRateLimiter } from "./middlewares/rateLimiter.middleware";
import { errorHandler } from "./middlewares/errorHandler.middleware";
import { notFoundHandler } from "./middlewares/notFoundHandler.middleware";
import { EnvValidator } from "./utils/envValidator.util";
import { LogHelper, LogSeverity } from "./helper/log.helper";
import { initSocket } from "./config/socket.config";

import discordRoutes from "./routes/discord.routes";
import systemRoutes from "./routes/system.routes";

// .env laden
dotenv.config();

// Pflicht-Variablen prüfen
EnvValidator.checkEnv([
  "HTTPPORT",
  "DISCORD_CLIENT_ID",
  "DISCORD_CLIENT_SECRET",
]);

// A rejected promise with no .catch() is a bug, but the server itself is
// still in a known state, so log it and keep serving requests.
process.on("unhandledRejection", (reason) => {
  void LogHelper.logError("unhandledRejection", reason, LogSeverity.CRITICAL);
});

// An uncaught throw leaves the process in an unknown state — log it and
// exit so the process manager (systemd, Docker, PM2, ...) can restart it.
process.on("uncaughtException", (err) => {
  void LogHelper.logError("uncaughtException", err, LogSeverity.CRITICAL).finally(
    () => process.exit(1),
  );
});

const app = express();

app.set("trust proxy", 1);

// Correlation ID: must be first so all subsequent logs carry the request ID
app.use(correlationId);

// Security-Header
app.use(helmet());

// CORS (später origin einschränken)
app.use(
  cors({
    origin: "*",
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

const HTTPPORT: number = parseInt(process.env.HTTPPORT || "8444", 10);

let server: http.Server | https.Server;

server = http.createServer(app);
server.listen(HTTPPORT, "127.0.0.1", () => {
  console.log(`🚀 HTTP running on ${HTTPPORT}`);
});

initSocket(server);
