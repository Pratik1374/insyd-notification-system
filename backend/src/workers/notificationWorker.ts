// src/workers/notificationWorker.ts
import { Worker, Job } from "bullmq";
import { connection } from "../queue/bullQueue";
import { Client } from "../db/client";
import { sendToUser } from "../ws/wsServer";

interface NotifyJobData {
  eventId: number;
  targetId: string;
}

const NOTIFICATION_QUEUE_NAME = "notification";

const worker = new Worker<NotifyJobData>(
  NOTIFICATION_QUEUE_NAME,
  async (job: Job<NotifyJobData>) => {
    const { eventId, targetId } = job.data;

    try {
      // 1. Build the notification message
      const eventRow = await Client.query(
        "SELECT type, actor_id FROM events WHERE id = $1",
        [eventId]
      );
      if (eventRow.rowCount === 0) {
        throw new Error(`Event not found: ${eventId}`);
      }

      const { type, actor_id: actorId } = eventRow.rows[0];

      const userRes = await Client.query(
        "SELECT name FROM users WHERE id = $1",
        [actorId]
      );
      const actorName =
        userRes.rowCount && userRes.rowCount > 0
          ? userRes.rows[0].name
          : "Someone";

      let message: string;
      switch (type) {
        case "follow":
          message = `${actorName} started following you.`;
          break;
        case "post":
          message = `${actorName} published a new post.`;
          break;
        case "comment":
          message = `${actorName} commented on your post.`;
          break;
        default:
          message = `${actorName} did something (${type}).`;
          break;
      }

      // 2. Insert into notifications table
      const insertNotificationText = `
        INSERT INTO notifications(user_id, event_id, message)
        VALUES($1, $2, $3)
        RETURNING id, created_at
      `;
      const insertValues = [targetId, eventId, message];
      const notifRes = await Client.query(insertNotificationText, insertValues);
      const notificationRow = notifRes.rows[0];

      // 3. Emit via WebSocket
      const payload = {
        id: notificationRow.id,
        userId: targetId,
        eventId,
        message,
        createdAt: notificationRow.created_at,
      };
      sendToUser(targetId, payload);
    } catch (err) {
      console.error("Worker error processing job:", err);
      throw err;
    }
  },
  {
    connection,
  }
);

worker.on("completed", (job) => {
  console.log(`✅ Completed job ${job.id} for eventId=${job.data.eventId}`);
});
worker.on("failed", (job, err) => {
  console.error("❌ [BullMQ] Job failed:", {
    queue: job?.queueName,
    id: job?.id,
    data: job?.data,
    attemptsMade: job?.attemptsMade,
    failedReason: err?.message ?? err,
    stack: err instanceof Error ? err.stack : null,
  });
});
