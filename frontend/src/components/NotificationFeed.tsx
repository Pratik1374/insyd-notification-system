import { Notification } from "@/types";

interface NotificationFeedProps {
  notifications: Notification[];
  onMarkRead: (id: number) => void;
  loading: Boolean;
}

export default function NotificationFeed({
  notifications,
  onMarkRead,
  loading,
}: NotificationFeedProps) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="relative inline-block">
        <h2 className="text-lg font-semibold text-gray-800 mb-2">
          Notifications
        </h2>
        <span className="absolute -top-2 -right-5 text-xs bg-violet-100 text-red-800 rounded-full w-5 h-5 flex items-center justify-center font-semibold">
          {notifications.length}
        </span>
      </div>
      {loading ? (
        <p className="text-center text-sm animate-pulse text-gray-400 italic font-semibold">
          Loading...
        </p>
      ) : (
        <>
          {notifications.length === 0 ? (
            <p className="text-gray-500">No notifications yet.</p>
          ) : (
            <ul className="space-y-2">
              {notifications.map((notification) => (
                <li
                  key={notification.id}
                  className={`flex justify-between items-start border-b border-gray-200 pb-2 ${
                    notification.isRead ? "opacity-50" : ""
                  }`}
                >
                  <div>
                    <p
                      className={`${
                        notification.isRead
                          ? "text-gray-500"
                          : "text-gray-800 font-medium"
                      }`}
                    >
                      {notification.message}
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(notification.createdAt).toLocaleString(
                        "en-IN",
                        {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                          second: "2-digit",
                          hour12: true,
                        }
                      )}
                    </p>
                    {notification.isRead && notification.seenAt && (
                      <p className="text-xs text-gray-400">
                        Read at
                        {new Date(notification.seenAt).toLocaleTimeString(
                          "en-IN",
                          {
                            hour: "numeric",
                            minute: "2-digit",
                            second: "2-digit",
                            hour12: true,
                          }
                        )}
                      </p>
                    )}
                  </div>

                  {!notification.isRead && (
                    <button
                      className="ml-4 text-sm text-blue-600 hover:underline cursor-pointer"
                      onClick={() => onMarkRead(notification.id)}
                    >
                      Mark Read
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
