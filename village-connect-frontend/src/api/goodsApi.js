import API from "./client";

export const createGoodsRequest = (data) => API.post("/goods", data);
export const getGoodsRequests = () => API.get("/goods");
export const acceptGoodsDelivery = (data) => API.post("/goods-match", data);
