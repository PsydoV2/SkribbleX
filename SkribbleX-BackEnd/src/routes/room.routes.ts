// src/routes/room.routes.ts
import { Router } from "express";
import * as roomService from "../services/room.service";

const router = Router();

router.post("/rooms", async (req, res, next) => {
  try {
    const room = await roomService.createRoom(req.body);
    res.status(201).json(room);
  } catch (err) {
    next(err);
  }
});

export default router;
