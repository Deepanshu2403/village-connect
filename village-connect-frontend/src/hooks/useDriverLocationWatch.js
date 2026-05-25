import { useEffect, useRef, useState } from "react";
import { useSocket } from "../context/SocketContext";
import { joinRideRoom, leaveRideRoom } from "../services/socket";

export function useDriverLocationWatch(driverId, travelPostId, isActive) {
  const [driverLocation, setDriverLocation] = useState(null);
  const [isStale, setIsStale] = useState(false);
  const lastUpdateRef = useRef(null);
  const { on, off } = useSocket() || {};

  useEffect(() => {
    if (!isActive || !travelPostId || !on || !off) return undefined;

    joinRideRoom(travelPostId);

    const handleLocationUpdate = (data) => {
      if (Number(data.driverId) === Number(driverId)) {
        lastUpdateRef.current = Date.now();
        setDriverLocation({ lat: data.lat, lng: data.lng, updatedAt: data.timestamp });
        setIsStale(false);
      }
    };

    on("location:update", handleLocationUpdate);

    const staleTimer = window.setInterval(() => {
      if (lastUpdateRef.current && Date.now() - lastUpdateRef.current > 30000) {
        setIsStale(true);
      }
    }, 5000);

    return () => {
      leaveRideRoom(travelPostId);
      off("location:update", handleLocationUpdate);
      window.clearInterval(staleTimer);
    };
  }, [driverId, isActive, off, on, travelPostId]);

  return { driverLocation, isStale };
}
