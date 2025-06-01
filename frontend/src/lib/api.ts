import { Notification } from "@/types";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL;

export async function postEvent(event: {
  type: string;
  actorId: string;
  targetId: string;
}) {
  try {
    const res = await fetch(`${BACKEND_URL}/event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
    });
    if (!res.ok) {
      throw new Error(`HTTP error ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    console.error("Failed to post event:", err);
    throw err;
  }
}

export async function getNotifications(
  userId: string
): Promise<Notification[]> {
  try {
    const res = await fetch(`${BACKEND_URL}/notifications/${userId}`);
    if (!res.ok) {
      throw new Error(`HTTP error ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    console.error(`Failed to fetch notifications for user ${userId}:`, err);
    throw err;
  }
}

export async function markNotificationAsRead(
  notificationId: number
): Promise<Notification> {
  try {
    const res = await fetch(
      `${BACKEND_URL}/notifications/${notificationId}/read`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      }
    );
    if (!res.ok) {
      throw new Error(`HTTP error ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    console.error(
      `Failed to mark notification ${notificationId} as read:`,
      err
    );
    throw err;
  }
}
