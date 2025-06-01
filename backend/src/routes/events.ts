// src/routes/events.ts
import { Router, Request, Response } from "express";
import { Client } from "../db/client";
import { notificationQueue } from "../queue/bullQueue";

const router = Router();

/**
 * POST /event
 * Body: { type: string, actorId: string, targetId: string, payload?: Record<string, any> }
 */
router.post("/", async (req: Request, res: Response) => {
  const { type, actorId, targetId, payload } = req.body;

  if (
    typeof type !== "string" ||
    typeof actorId !== "string" ||
    typeof targetId !== "string"
  ) {
    res.status(400).json({ error: "Invalid parameters." });
    return;
  }

  try {
    // 1. Insert into events table
    const insertText =
      "INSERT INTO events(type, actor_id, target_id, payload) VALUES($1, $2, $3, $4) RETURNING id";
    const insertValues = [type, actorId, targetId, payload || {}];
    const result = await Client.query(insertText, insertValues);

    const eventId = result.rows[0].id;

    // 2. Enqueue a job for this target user
    await notificationQueue.add(
      "notify",
      { eventId, targetId },
      {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 1000, // 1 second initial delay, then 2s, then 4s, etc.
        },
      }
    );

    res.status(200).json({ success: true, eventId });
  } catch (err) {
    console.error("Error in POST /event:", err);
    res.status(500).json({ error: "Could not create event." });
  }
});

export default router;
