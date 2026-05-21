import API from "./client";

export const requestRide = (travelPostId) =>
  API.post("/request", { travelPostId: Number(travelPostId) });

export const acceptRideRequest = (requestId) =>
  API.put("/request/accept", { requestId: Number(requestId) });

export const rejectRideRequest = (requestId) =>
  API.put("/request/reject", { requestId: Number(requestId) });

export const deleteRideRequest = (requestId) =>
  API.delete(`/request/${Number(requestId)}`);

export const deletePassengerRequest = (requestId) =>
  API.delete(`/request/${Number(requestId)}/delete`);

export const startTrip = (travelPostId) =>
  API.put("/request/start-trip", { travelPostId: Number(travelPostId) });

export const markPickupDone = (travelPostId) =>
  API.put("/request/pickup-done", { travelPostId: Number(travelPostId) });

export const markDropDone = (travelPostId) =>
  API.put("/request/drop-done", { travelPostId: Number(travelPostId) });
