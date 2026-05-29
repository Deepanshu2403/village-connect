import API from "./client";

export const registerUser = (data) => API.post("/auth/register", data);
export const loginUser = (data) => API.post("/auth/login", data);
export const getMe = () => API.get("/auth/me");
export const sendOTP = (phone, purpose) =>
  API.post("/otp/send", { phone, purpose });
export const verifyOTP = (phone, otp, purpose) =>
  API.post("/otp/verify", { phone, otp, purpose });
export const resetPassword = (phone, newPassword) =>
  API.post("/auth/reset-password", { phone, newPassword });
