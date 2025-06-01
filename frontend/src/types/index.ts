export interface Notification {
  id: number;
  userId: string;
  eventId: number;
  message: string;
  createdAt: string;
  isRead: boolean;
  seenAt: string | null;
}
