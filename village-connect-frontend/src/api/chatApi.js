import API from "./client";

export const getChat = (userId) => API.get(`/chat/${userId}`);
export const sendMessage = (receiverId, text) =>
  API.post("/chat/send", { receiverId: Number(receiverId), text });
