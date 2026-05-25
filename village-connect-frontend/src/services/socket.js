import { io } from "socket.io-client";

const SOCKET_URL =
  import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, "") || "http://localhost:5000";

let socket = null;

export function initSocket(token) {
  if (socket?.connected) return socket;

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
    timeout: 10000,
  });

  socket.on("connect", () => {
    console.log("[SOCKET] Connected:", socket.id);
  });

  socket.on("connect_error", (err) => {
    console.warn("[SOCKET] Connection error:", err.message);
  });

  socket.on("disconnect", (reason) => {
    console.log("[SOCKET] Disconnected:", reason);
  });

  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function joinRideRoom(rideId) {
  if (socket?.connected) {
    socket.emit("join:ride", rideId);
  }
}

export function leaveRideRoom(rideId) {
  if (socket?.connected) {
    socket.emit("leave:ride", rideId);
  }
}
