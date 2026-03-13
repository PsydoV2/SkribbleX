// src/index.ts – Entry point
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

dotenv.config();

EnvValidator.checkEnv(["HTTPPORT", "HTTPSPORT"]);

const app = express();

app.use(helmet());

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Authorization", "Content-Type"],
    credentials: true,
  }),
);

app.use(json());
app.use(globalRateLimiter);

app.use(notFoundHandler);
app.use(errorHandler);

const HTTPPORT = Number(process.env.HTTPPORT) || 9080;
const HTTPSPORT = Number(process.env.HTTPSPORT) || 9444;

let server: http.Server | https.Server;

if (process.env.NODE_ENV === "localhost") {
  server = http.createServer(app);
  server.listen(HTTPPORT, () => {
    console.log(`🚀 HTTP running on ${HTTPPORT}`);
  });
} else {
  const key = fs.readFileSync("./key.key");
  const cert = fs.readFileSync("./fullchain.pem");

  server = https.createServer({ key, cert }, app);
  server.listen(HTTPSPORT, () => {
    console.log(`🚀 HTTPS running on ${HTTPSPORT}`);
  });

  http
    .createServer((req, res) => {
      const host = req.headers.host || "";
      res.writeHead(301, { Location: `https://${host}${req.url}` });
      res.end();
    })
    .listen(HTTPPORT, () => {
      console.log(`➡️  Redirect HTTP ${HTTPPORT} → HTTPS ${HTTPSPORT}`);
    });
}

initSocket(server);
