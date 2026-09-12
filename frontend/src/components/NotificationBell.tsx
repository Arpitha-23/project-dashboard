import { useEffect, useState } from "react";
import api from "../api";
import { getSocket } from "../socket";
import { useAuth } from "../auth/AuthContext";

interface Notification {
  id: number;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationBell() {
  const { accessToken } = useAuth();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  async function loadNotifications() {
    if (!accessToken) return;

    try {
      const response = await api.get("/notifications", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      setNotifications(response.data.notifications || []);
    } catch (error) {
      console.error("Failed to load notifications:", error);
    }
  }

  async function loadUnreadCount() {
    if (!accessToken) return;

    try {
      const response = await api.get(
        "/notifications/unread-count",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      setUnreadCount(response.data.count || 0);
    } catch (error) {
      console.error(
        "Failed to load unread notification count:",
        error
      );
    }
  }

  useEffect(() => {
    if (!accessToken) return;

    loadNotifications();
    loadUnreadCount();

    const socket = getSocket();

    if (!socket) return;

    const handleNewNotification = (
      notification: Notification
    ) => {
      setNotifications((previous) => [
        notification,
        ...previous,
      ]);

      setUnreadCount((previous) => previous + 1);
    };

    const handleNotificationCount = (count: number) => {
      setUnreadCount(count);
    };

    socket.on(
      "notification:new",
      handleNewNotification
    );

    socket.on(
      "notification:count",
      handleNotificationCount
    );

    return () => {
      socket.off(
        "notification:new",
        handleNewNotification
      );

      socket.off(
        "notification:count",
        handleNotificationCount
      );
    };
  }, [accessToken]);

  async function markAsRead(id: number) {
    if (!accessToken) return;

    try {
      await api.patch(
        `/notifications/${id}/read`,
        {},
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      setNotifications((previous) =>
        previous.map((notification) =>
          notification.id === id
            ? { ...notification, isRead: true }
            : notification
        )
      );

      setUnreadCount((previous) =>
        Math.max(0, previous - 1)
      );
    } catch (error) {
      console.error(
        "Failed to mark notification as read:",
        error
      );
    }
  }

  async function markAllAsRead() {
    if (!accessToken) return;

    try {
      await api.patch(
        "/notifications/read-all",
        {},
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      setNotifications((previous) =>
        previous.map((notification) => ({
          ...notification,
          isRead: true,
        }))
      );

      setUnreadCount(0);
    } catch (error) {
      console.error(
        "Failed to mark all notifications as read:",
        error
      );
    }
  }

  function formatTime(dateString: string) {
    const date = new Date(dateString);

    return date.toLocaleString();
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((previous) => !previous)}
        className="relative rounded-lg border border-slate-200 bg-white px-3 py-2 text-xl shadow-sm hover:bg-slate-50"
      >
        🔔

        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-96 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <div>
              <h3 className="font-semibold text-slate-900">
                Notifications
              </h3>

              <p className="text-xs text-slate-500">
                {unreadCount} unread
              </p>
            </div>

            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-sm font-medium text-blue-600 hover:text-blue-800"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-500">
                No notifications yet.
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`border-b border-slate-100 px-4 py-3 ${
                    notification.isRead
                      ? "bg-white"
                      : "bg-blue-50"
                  }`}
                >
                  <div className="flex gap-3">
                    <div className="mt-1 text-lg">
                      {notification.isRead
                        ? "📩"
                        : "🔵"}
                    </div>

                    <div className="flex-1">
                      <p className="text-sm text-slate-800">
                        {notification.message}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {formatTime(
                          notification.createdAt
                        )}
                      </p>

                      {!notification.isRead && (
                        <button
                          onClick={() =>
                            markAsRead(notification.id)
                          }
                          className="mt-2 text-xs font-medium text-blue-600 hover:text-blue-800"
                        >
                          Mark as read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}