import API from "./client";

export const giveRating = (data) => API.post("/ratings", data);
