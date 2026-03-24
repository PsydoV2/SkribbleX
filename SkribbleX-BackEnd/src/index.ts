// index.ts – Entry point of the API (Express + TypeScript)
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import https from "https";
import http from "http";
import fs from "fs";
import { json } from "body-parser";

import { globalRateLimiter } from "./middlewares/globalRateLimiter.middleware";
import { errorHandler, notFoundHandler } from "./middlewares/error.middleware";
import { EnvValidator } from "./utils/EnvValidator";
import { initSocket } from "./config/socket";

import discordRoutes from "./routes/discord.routes";

// .env laden
dotenv.config();

// Pflicht-Variablen prüfen
EnvValidator.checkEnv([
  "HTTPPORT",
  "DISCORD_CLIENT_ID",
  "DISCORD_CLIENT_SECRET",
]);

const app = express();

app.set("trust proxy", 1);

// Security-Header
app.use(helmet());

// Simple Logger
app.use((req, _res, next) => {
  console.log(`🔥 ${req.method} ${req.url}`);
  next();
});

// CORS (später origin einschränken)
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Authorization", "Content-Type"],
    credentials: true,
  }),
);

// JSON Body Parser
app.use(json());

// Rate Limiting (kannst du zum Debuggen auskommentieren)
app.use(globalRateLimiter);

// --- REST-Routen ---
app.use("/api", discordRoutes);

// Fallbacks
app.use(notFoundHandler);
app.use(errorHandler);

const HTTPPORT: number = parseInt(process.env.HTTPPORT || "8444", 10);

let server: http.Server | https.Server;

server = http.createServer(app);
server.listen(HTTPPORT, () => {
  console.log(`🚀 HTTP running on ${HTTPPORT}`);
});

initSocket(server);
