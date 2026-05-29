import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Bell, History, LogOut, Menu, Package, Route, UserRound, X } from "lucide-react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { getNotifications, markNotificationRead } from "../../api/notificationApi";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../context/SocketContext";
import { useToast } from "../../context/ToastContext";
import { initials } from "../../utils/format";
import { timeAgo } from "../../utils/timeAgo";

const links = {
  driver: [
    { label: "Dashboard", to: "/driver", icon: Route },
    { label: "Post Travel", to: "/create-travel", icon: Route },
    { label: "History", to: "/history", icon: History },
  ],
  passenger: [
    { label: "Find Rides", to: "/home", icon: Route },
    { label: "Send Goods", to: "/create-goods", icon: Package },
    { label: "My Trips", to: "/passenger", icon: UserRound },
    { label: "History", to: "/history", icon: History },
  ],
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const { on, off } = useSocket() || {};
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const dropdownRef = useRef(null);

  const roleLinks = links[user?.role] || [];
  const unreadCount = notifications.filter((item) => !item.isRead).length;

  const fetchNotifications = useCallback(async () => {
    setLoadingNotifications(true);
    try {
      const res = await getNotifications();
      setNotifications(res.data.notifications || []);
    } catch {
      addToast("Unable to load notifications", "error");
    } finally {
      setLoadingNotifications(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchNotifications();
    const intervalId = window.setInterval(fetchNotifications, 30000);
    return () => window.clearInterval(intervalId);
  }, [fetchNotifications]);

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

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setNotifOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const handleNotificationClick = async (notification) => {
    if (!notification.isRead) {
      try {
        await markNotificationRead(notification.id);
        setNotifications((current) =>
          current.map((item) =>
            item.id === notification.id ? { ...item, isRead: true } : item
          )
        );
      } catch {
        addToast("Could not mark notification as read", "error");
      }
    }

    if (notification.link) {
      navigate(notification.link);
    }
    setNotifOpen(false);
  };

  const handleLogout = () => {
    logout();
    addToast("Logged out successfully", "info");
    navigate("/");
  };

  return (
    <nav className="fixed top-0 z-50 h-16 w-full bg-white/95 shadow-sm backdrop-blur">
      <div className="mx-auto flex h-full max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          to={user?.role === "driver" ? "/driver" : "/passenger"}
          className="flex items-center gap-3 font-extrabold text-gray-900"
          onClick={() => setMenuOpen(false)}
        >
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-orange-500 text-white">
            VC
          </span>
          <span className="hidden sm:inline">Village Connect</span>
        </Link>

        <div
          className={`absolute left-4 right-4 top-20 grid gap-2 rounded-2xl bg-white p-3 shadow-md md:static md:ml-6 md:flex md:flex-1 md:bg-transparent md:p-0 md:shadow-none ${
            menuOpen ? "grid" : "hidden md:flex"
          }`}
        >
          {roleLinks.map(({ label, to, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                  isActive
                    ? "bg-orange-50 text-orange-600"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
          <button
            type="button"
            onClick={handleLogout}
            className="w-full border-t border-gray-100 px-4 py-3 text-left text-sm font-semibold text-red-500 md:hidden"
          >
            Logout
          </button>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => {
                setNotifOpen((open) => !open);
                fetchNotifications();
              }}
              className="relative grid h-10 w-10 place-items-center rounded-xl border border-gray-200 bg-white text-gray-700 transition hover:border-orange-400 hover:text-orange-600"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-orange-500 px-1 text-xs font-bold text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <>
                <div
                  className="fixed inset-0 z-40 bg-black/20 md:hidden"
                  onClick={() => setNotifOpen(false)}
                />

                <div className="fixed left-3 right-3 top-[68px] z-50 flex max-h-[75vh] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl md:left-auto md:right-4 md:top-[72px] md:w-[320px] md:max-h-[480px]">
                  <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-100 px-4 py-3">
                    <h3 className="text-sm font-bold text-gray-900">Notifications</h3>
                    <div className="flex items-center gap-2">
                      {unreadCount > 0 && (
                        <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-bold text-orange-600">
                          {unreadCount} new
                        </span>
                      )}
                      <button
                        type="button"
                        className="p-1 text-gray-400 hover:text-gray-600 md:hidden"
                        onClick={() => setNotifOpen(false)}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto">
                    {loadingNotifications && notifications.length === 0 ? (
                      <div className="p-4 text-sm font-semibold text-gray-500">Loading...</div>
                    ) : notifications.length === 0 ? (
                      <div className="p-6 text-center text-sm text-gray-500">
                        No notifications yet.
                      </div>
                    ) : (
                      notifications.slice(0, 8).map((item) => (
                        <button
                          type="button"
                          key={item.id}
                          onClick={() => handleNotificationClick(item)}
                          className={`w-full cursor-pointer border-b border-gray-100 p-4 text-left transition ${
                            !item.isRead ? "bg-orange-50/60" : "bg-white"
                          } ${item.link ? "hover:bg-orange-50" : ""}`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-gray-900">{item.message}</p>
                              <p className="mt-1 text-xs text-gray-500">{timeAgo(item.createdAt)}</p>
                            </div>
                            {item.link && <ArrowRight className="mt-1 h-4 w-4 text-orange-500" />}
                          </div>
                        </button>
                      ))
                    )}
                  </div>

                  <Link
                    to="/notifications"
                    className="block flex-shrink-0 border-t border-gray-100 py-3 text-center text-sm font-semibold text-orange-500"
                    onClick={() => setNotifOpen(false)}
                  >
                    View all notifications
                  </Link>
                </div>
              </>
            )}
          </div>

          <div className="hidden items-center gap-2 rounded-xl bg-gray-50 px-2 py-1 md:flex">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-orange-100 text-sm font-extrabold text-orange-700">
              {initials(user?.name)}
            </span>
            <span className="max-w-32 truncate text-sm font-semibold text-gray-700">
              {user?.name}
            </span>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="hidden items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 transition hover:border-orange-400 hover:text-orange-600 md:flex"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>

          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="grid h-10 w-10 place-items-center rounded-xl border border-gray-200 text-gray-700 md:hidden"
            aria-label="Toggle navigation menu"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
    </nav>
  );
}
