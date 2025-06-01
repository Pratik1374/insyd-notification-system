// src/index.ts
import dotenv from "dotenv";
dotenv.config();

import { Client } from "./db/client";
import { createServer } from "http";
import { initWebSocketServer } from "./ws/wsServer";
import "./workers/notificationWorker";
import { initExpressApp } from "./server";

const PORT = process.env.PORT || 4000;

async function main() {
  // 1. Connect to Postgres
  try {
    await Client.connect();
    console.log("🗄️  Connected to PostgreSQL");
  } catch (err) {
    console.error("❌ Failed to connect to PostgreSQL:", err);
    process.exit(1);
  }

  // 2. Create Express app + HTTP server
  const app = initExpressApp();
  const server = createServer(app);

  // 3. Attach WebSocket server
  initWebSocketServer(server);

  // 4. Start listening
  server.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
