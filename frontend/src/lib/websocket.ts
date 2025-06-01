import { Notification } from "@/types";

const sockets: Map<string, WebSocket> = new Map();

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:4000/ws";

export function connectWebSocket(
  userId: string,
  onMessage: (notification: Notification) => void
) {
  const ws = new WebSocket(WS_URL);

  ws.onopen = () => {
    ws.send(JSON.stringify({ userId }));
    console.log(`WebSocket connected for user ${userId}`);
  };

  ws.onmessage = (event) => {
    try {
      const notification: Notification = JSON.parse(event.data);
      onMessage(notification);
    } catch (err) {
      console.error("WebSocket message parse error:", err);
    }
  };

  ws.onclose = () => {
    console.log(`WebSocket disconnected for user ${userId}`);
    sockets.delete(userId);
  };

  ws.onerror = (err) => {
    console.error(`WebSocket error for user ${userId}:`, err);
  };

  sockets.set(userId, ws);
}

export function disconnectWebSocket(userId: string) {
  const ws = sockets.get(userId);
  if (ws) {
    ws.close();
    sockets.delete(userId);
  }
}
