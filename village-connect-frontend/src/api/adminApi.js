import API from "./client";

export const getAdminStats = () => API.get("/admin/stats");
export const getAdminUsers = (params) => API.get("/admin/users", { params });
export const toggleUserSuspend = (id) => API.put(`/admin/users/${id}/suspend`);
export const deleteAdminUser = (id) => API.delete(`/admin/users/${id}`);
export const getAdminRides = (params) => API.get("/admin/rides", { params });
export const cancelAdminRide = (id) => API.put(`/admin/rides/${id}/cancel`);
export const deleteAdminRide = (id) => API.delete(`/admin/rides/${id}`);
export const getAdminGoods = (params) => API.get("/admin/goods", { params });
export const deleteAdminGoods = (id) => API.delete(`/admin/goods/${id}`);
export const getAdminBookings = (params) => API.get("/admin/bookings", { params });
