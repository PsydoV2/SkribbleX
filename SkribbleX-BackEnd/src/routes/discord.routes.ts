// src/routes/discord.routes.ts
import { Router } from "express";
import { exchangeToken } from "../controllers/discord.controller";

const router = Router();

router.post("/discord/token", exchangeToken);

export default router;
