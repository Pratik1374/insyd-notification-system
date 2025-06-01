"use client";

import { useEffect, useState } from "react";
import { connectWebSocket, disconnectWebSocket } from "@/lib/websocket";
import { postEvent, getNotifications, markNotificationAsRead } from "@/lib/api";
import { Notification } from "@/types";
import EventButton from "./EventButton";
import NotificationFeed from "./NotificationFeed";

interface OtherUser {
  userId: string;
  userName: string;
}

interface UserPanelProps {
  userId: string;
  userName: string;
  otherUsers: OtherUser[];
}

export default function UserPanel({
  userId,
  userName,
  otherUsers,
}: UserPanelProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Helper to fetch initial notifications using async/await
    const fetchInitialNotifications = async () => {
      try {
        setIsLoading(true);
        const data = await getNotifications(userId);
        setNotifications(data);
      } catch (err) {
        console.error("Failed to fetch notifications:", err);
      } finally {
        setIsLoading(false);
      }
    };

    // 1. Connect to WebSocket and listen for new notifications
    connectWebSocket(userId, (notification) => {
      setNotifications((prev) => [notification, ...prev]);
    });

    // 2. Fetch initial notifications
    fetchInitialNotifications();

    // 3. Cleanup on unmount
    return () => {
      disconnectWebSocket(userId);
    };
  }, [userId]);

  // Handler to mark a single notification as read
  const markAsRead = async (notificationId: number) => {
    try {
      const updated = await markNotificationAsRead(notificationId);
      // Update local state with the updated notification (isRead = true, seenAt set)
      setNotifications((prev) =>
        prev.map((n) => (n.id === updated.id ? updated : n))
      );
    } catch (err) {
      console.error(
        `Failed to mark notification ${notificationId} as read:`,
        err
      );
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">
        {userName} ({userId})
      </h1>
      <div className="mb-6 flex gap-1 flex-wrap">
        <EventButton
          label="Post Blog"
          onClick={() =>
            otherUsers.forEach(({ userId: targetId }) =>
              postEvent({ type: "post", actorId: userId, targetId })
            )
          }
        />
        {otherUsers.map(({ userId: targetId, userName: targetName }) => (
          <div
            key={targetId}
            className="flex gap-1 w-full flex-wrap md:flex-nowrap"
          >
            <EventButton
              label={`Follow ${targetName}`}
              onClick={() =>
                postEvent({ type: "follow", actorId: userId, targetId })
              }
            />
            <EventButton
              label={`Comment on ${targetName}'s Post`}
              onClick={() =>
                postEvent({ type: "comment", actorId: userId, targetId })
              }
            />
          </div>
        ))}
      </div>

      <NotificationFeed
        notifications={notifications}
        onMarkRead={markAsRead}
        loading={isLoading}
      />
    </div>
  );
}
