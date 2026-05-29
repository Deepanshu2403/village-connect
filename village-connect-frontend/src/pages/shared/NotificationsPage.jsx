import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Trash2, CheckCheck, BellOff } from "lucide-react";
import { useSocket } from "../../context/SocketContext";
import { useToast } from "../../context/ToastContext";
import BackButton from "../../components/common/BackButton";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  clearAllNotifications,
  clearReadNotifications,
} from "../../api/notificationApi";
import { timeAgo } from "../../utils/timeAgo";

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { on, off } = useSocket() || {};
  const { addToast } = useToast();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [clearLoading, setClearLoading] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const fetchNotifications = async () => {
    try {
      const res = await getNotifications();
      setNotifications(res.data.notifications || []);
    } catch {
      addToast("Failed to load notifications", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  useEffect(() => {
    if (!on || !off) return undefined;

    const handleNewNotification = (notification) => {
      setNotifications((current) => {
        if (current.some((item) => item.id === notification.id)) return current;
        return [notification, ...current];
      });
    };

    on("notification:new", handleNewNotification);
    return () => off("notification:new", handleNewNotification);
  }, [off, on]);

  const handleClick = async (notif) => {
    if (!notif.isRead) {
      try {
        await markNotificationRead(notif.id);
        setNotifications((prev) =>
          prev.map((item) => (item.id === notif.id ? { ...item, isRead: true } : item))
        );
      } catch {
        addToast("Could not mark notification as read", "error");
      }
    }
    if (notif.link) {
      navigate(notif.link);
    }
  };

  const handleDelete = async (event, id) => {
    event.stopPropagation();
    setActionLoading(id);
    try {
      await deleteNotification(id);
      setNotifications((prev) => prev.filter((item) => item.id !== id));
    } catch {
      addToast("Could not delete notification", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
      addToast("All marked as read", "success");
    } catch {
      addToast("Failed to mark all read", "error");
    }
  };

  const handleClearAll = async () => {
    setClearLoading(true);
    try {
      await clearAllNotifications();
      setNotifications([]);
      setConfirmClear(false);
      addToast("All notifications cleared", "info");
    } catch {
      addToast("Failed to clear notifications", "error");
    } finally {
      setClearLoading(false);
    }
  };

  const handleClearRead = async () => {
    try {
      await clearReadNotifications();
      setNotifications((prev) => prev.filter((item) => !item.isRead));
      addToast("Read notifications cleared", "info");
    } catch {
      addToast("Failed to clear read notifications", "error");
    }
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const groups = {
    Today: notifications.filter((item) => new Date(item.createdAt) >= today),
    Yesterday: notifications.filter((item) => {
      const date = new Date(item.createdAt);
      return date >= yesterday && date < today;
    }),
    Earlier: notifications.filter((item) => new Date(item.createdAt) < yesterday),
  };

  const unreadCount = notifications.filter((item) => !item.isRead).length;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="mx-auto max-w-2xl px-4 py-6">
        <div className="pb-4 pt-2">
          <BackButton label="Back" />
        </div>
        <div className="flex items-start justify-between mb-4 gap-4">
          <div>
            <h1 className="text-xl font-extrabold text-gray-900">Notifications</h1>
            {unreadCount > 0 && (
              <p className="text-sm text-orange-500 font-semibold mt-0.5">
                {unreadCount} unread
              </p>
            )}
          </div>

          {notifications.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-xl transition-colors"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Mark all read
                </button>
              )}
              <button
                type="button"
                onClick={handleClearRead}
                className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-xl transition-colors"
              >
                Clear read
              </button>
              {!confirmClear ? (
                <button
                  type="button"
                  onClick={() => setConfirmClear(true)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-red-500 bg-red-50 hover:bg-red-100 px-3 py-2 rounded-xl transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear all
                </button>
              ) : (
                <div className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2">
                  <span className="text-xs text-gray-500">Sure?</span>
                  <button
                    type="button"
                    onClick={handleClearAll}
                    disabled={clearLoading}
                    className="text-xs text-red-600 font-bold disabled:opacity-60"
                  >
                    {clearLoading ? "..." : "Yes"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmClear(false)}
                    className="text-xs text-gray-500"
                  >
                    No
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="rounded-2xl bg-white border border-gray-200 p-12 text-center">
            <BellOff className="h-10 w-10 text-gray-300 mx-auto mb-4" />
            <p className="text-base font-semibold text-gray-700">No notifications</p>
            <p className="text-sm text-gray-400 mt-1">
              Ride updates and messages will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {Object.entries(groups).map(([label, items]) => {
              if (items.length === 0) return null;
              return (
                <div key={label}>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">
                    {label}
                  </p>
                  <div className="rounded-2xl bg-white border border-gray-200 overflow-hidden divide-y divide-gray-100">
                    {items.map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => handleClick(notif)}
                        className={`flex items-start gap-3 px-4 py-4 transition-colors ${
                          !notif.isRead ? "bg-orange-50" : "bg-white"
                        } ${notif.link ? "cursor-pointer hover:bg-orange-50/80" : "cursor-default"}`}
                      >
                        <div
                          className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                            !notif.isRead ? "bg-orange-500" : "bg-gray-200"
                          }`}
                        />

                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-800 leading-snug">
                            {notif.message}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {timeAgo(notif.createdAt)}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          {notif.link && <span className="text-xs text-gray-400">Go</span>}
                          <button
                            type="button"
                            onClick={(event) => handleDelete(event, notif.id)}
                            disabled={actionLoading === notif.id}
                            className="p-1.5 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                            title="Delete notification"
                          >
                            {actionLoading === notif.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
