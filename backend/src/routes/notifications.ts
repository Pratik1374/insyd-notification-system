// src/routes/notifications.ts
import { Router, Request, Response } from "express";
import { Client } from "../db/client";

const router = Router();

/**
 * GET /notifications/:userId
 * Returns a list of notifications for the specified userId
 */
router.get("/:userId", async (req: Request, res: Response) => {
  const { userId } = req.params;

  if (!userId) {
    res.status(400).json({ error: "userId is required" });
    return;
  }

  try {
    const query = `
      SELECT 
        id,
        user_id    AS "userId",
        event_id   AS "eventId",
        message,
        created_at AS "createdAt",
        "read"     AS "isRead",
        seen_at    AS "seenAt"
      FROM notifications
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 50
    `;

    const result = await Client.query(query, [userId]);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error(`Error fetching notifications for user ${userId}:`, err);
    res.status(500).json({ error: "Could not fetch notifications" });
  }
});

/**
 * PATCH /notifications/:notificationId/read
 * Marks a single notification as “read” (sets read = true & seen_at = NOW()).
 */
router.patch("/:notificationId/read", async (req: Request, res: Response) => {
  const { notificationId } = req.params;

  if (!notificationId) {
    res.status(400).json({ error: "notificationId is required" });
    return;
  }

  try {
    const updateQuery = `
      UPDATE notifications
      SET "read" = TRUE,
          seen_at = NOW()
      WHERE id = $1
      RETURNING id, user_id AS "userId", event_id AS "eventId", message, created_at AS "createdAt", "read" AS "isRead", seen_at AS "seenAt"
    `;
    const result = await Client.query(updateQuery, [notificationId]);

    if (result.rowCount === 0) {
      res.status(404).json({ error: "Notification not found" });
      return;
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error(`Error marking notification ${notificationId} as read:`, err);
    res.status(500).json({ error: "Could not mark notification as read" });
  }
});

export default router;
