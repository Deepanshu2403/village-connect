import { useEffect, useRef } from "react";
import { getSocket } from "../services/socket";

export function useDriverLocationBroadcast(activeTravelPostId) {
  const watchRef = useRef(null);
  const intervalRef = useRef(null);
  const latestCoords = useRef(null);

  useEffect(() => {
    if (!activeTravelPostId || !navigator.geolocation) return undefined;

    watchRef.current = navigator.geolocation.watchPosition(
      (position) => {
        latestCoords.current = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
      },
      (err) => console.warn("GPS error:", err.message),
      { enableHighAccuracy: true, maximumAge: 5000 }
    );

    intervalRef.current = window.setInterval(() => {
      const socket = getSocket();
      if (socket?.connected && latestCoords.current) {
        socket.emit("location:update", {
          lat: latestCoords.current.lat,
          lng: latestCoords.current.lng,
          travelPostId: activeTravelPostId,
        });
      }
    }, 5000);

    return () => {
      if (watchRef.current) navigator.geolocation.clearWatch(watchRef.current);
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [activeTravelPostId]);
}
