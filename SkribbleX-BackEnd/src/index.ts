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
import { initSocket } from "./socket";

import roomRoutes from "./routes/room.routes";

// .env laden
dotenv.config();

// Pflicht-Variablen prüfen
EnvValidator.checkEnv(["HTTPPORT", "HTTPSPORT"]);

const app = express();

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
  })
);

// JSON Body Parser
app.use(json());

// Rate Limiting (kannst du zum Debuggen auskommentieren)
app.use(globalRateLimiter);

// --- REST-Routen ---
app.use("/api", roomRoutes);

// Fallbacks
app.use(notFoundHandler);
app.use(errorHandler);

const HTTPPORT = Number(process.env.HTTPPORT) || 9080;
const HTTPSPORT = Number(process.env.HTTPSPORT) || 9444;

let server: http.Server | https.Server;

// Lokal nur HTTP, Prod mit HTTPS
if (process.env.NODE_ENV === "localhost") {
  server = http.createServer(app);
  server.listen(HTTPPORT, () => {
    console.log(`🚀 HTTP running on ${HTTPPORT}`);
  });
} else {
  // Zertifikate einlesen – Pfade ggf. in .env packen
  const key = fs.readFileSync("./key.key");
  const cert = fs.readFileSync("./fullchain.pem");

  server = https.createServer({ key, cert }, app);
  server.listen(HTTPSPORT, () => {
    console.log(`🚀 HTTPS running on ${HTTPSPORT}`);
  });

  // Optional: HTTP → HTTPS Redirect
  http
    .createServer((req, res) => {
      const host = req.headers.host || "";
      res.writeHead(301, {
        Location: `https://${host}${req.url}`,
      });
      res.end();
    })
    .listen(HTTPPORT, () => {
      console.log(`➡️  Redirect HTTP ${HTTPPORT} → HTTPS ${HTTPSPORT}`);
    });
}

// Socket.io an den HTTPS-/HTTP-Server hängen
initSocket(server);
