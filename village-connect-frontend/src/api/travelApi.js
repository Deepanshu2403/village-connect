import API from "./client";

export const getTravelPosts = (params = {}) => API.get("/travel", { params });
export const getTravelById = (id) => API.get(`/travel/${id}`);
export const createTravel = (data) => API.post("/travel", data);
export const cancelTrip = (id) => API.put(`/travel/${id}/cancel`);
