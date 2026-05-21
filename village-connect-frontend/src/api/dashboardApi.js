import API from "./client";

export const getDriverDashboard = () => API.get("/driver/dashboard");
export const getPassengerDashboard = () => API.get("/passenger/dashboard");
