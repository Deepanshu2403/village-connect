import API from "./client";

export const createItemRequest = (data) => API.post("/items", data);
export const getItemRequests = () => API.get("/items");
export const acceptItemRequest = (id, travelPostId) =>
  API.put(`/items/${id}/accept`, { travelPostId });
export const markItemPickedUp = (id) => API.put(`/items/${id}/picked-up`);
export const markItemDelivered = (id) => API.put(`/items/${id}/delivered`);
export const cancelItemRequest = (id) => API.put(`/items/${id}/cancel`);
