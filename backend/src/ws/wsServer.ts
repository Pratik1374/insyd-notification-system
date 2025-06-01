// src/ws/wsServer.ts
import { Server as HttpServer } from "http";
import WebSocket, { WebSocketServer } from "ws";

// Map of userId → Set of WebSocket connections
const clients: Map<string, Set<WebSocket>> = new Map();

/**
 * Initialize WebSocket server on top of the existing HTTP server.
 * Clients must send an initial JSON message: { userId: string }
 */
export function initWebSocketServer(server: HttpServer) {
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws: WebSocket) => {
    console.log("🕸️  New WebSocket connection established.");

    let thisUserId: string | null = null;

    // Expect the first message to be: { userId: 'u1' } (no authentication in POC)
    ws.once("message", (msg) => {
      try {
        const payload = JSON.parse(msg.toString());
        if (typeof payload.userId === "string") {
          thisUserId = payload.userId;
          if (thisUserId !== null) {
            // Initialize a Set for the userId if it doesn't exist
            if (!clients.has(thisUserId)) {
              clients.set(thisUserId, new Set());
            }
            // Add the WebSocket connection to the user's Set
            clients.get(thisUserId)!.add(ws);
            console.log(
              `👤 Registered WebSocket for user=${thisUserId}, total connections: ${
                clients.get(thisUserId)!.size
              }`
            );
          }
        } else {
          ws.close(1008, "Missing userId");
        }
      } catch (err) {
        ws.close(1008, "Invalid JSON");
      }
    });

    ws.on("close", () => {
      if (thisUserId && clients.has(thisUserId)) {
        // Remove the WebSocket connection from the user's Set
        clients.get(thisUserId)!.delete(ws);
        console.log(
          `❌ WebSocket disconnected for user=${thisUserId}, remaining connections: ${
            clients.get(thisUserId)!.size
          }`
        );
        // Clean up the Set if it's empty
        if (clients.get(thisUserId)!.size === 0) {
          clients.delete(thisUserId);
          console.log(`🗑️ Removed empty connection set for user=${thisUserId}`);
        }
      }
    });
  });
}

/**
 * Send a notification payload to a specific userId over all their WebSocket connections.
 */
export function sendToUser(userId: string, payload: any) {
  const userConnections = clients.get(userId);
  if (userConnections) {
    userConnections.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(payload));
      }
    });
  }
}
