import API from "./client";

export const getNotifications = () => API.get("/notifications");
export const markNotificationRead = (id) =>
  API.put("/notifications/read", { id: Number(id) });

export const markAllNotificationsRead = () =>
  API.put("/notifications/read-all");

export const deleteNotification = (id) =>
  API.delete(`/notifications/${Number(id)}`);

export const clearAllNotifications = () =>
  API.delete("/notifications/clear-all");

export const clearReadNotifications = () =>
  API.delete("/notifications/clear-read");
