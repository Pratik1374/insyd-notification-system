// src/queue/bullQueue.ts
import { Queue } from "bullmq";
import IORedis from "ioredis";

const redisUrl = process.env.REDIS_URL;
if (!redisUrl) {
  throw new Error("REDIS_URL is not defined in .env");
}

// Create a shared Redis connection for BullMQ
export const connection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
});

// queue - “notification”
export const notificationQueue = new Queue("notification", {
  connection,
});
