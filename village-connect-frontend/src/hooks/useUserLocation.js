import { useEffect, useState } from "react";
import { reverseGeocode, updateDriverLocation } from "../api/locationApi";

export function useUserLocation() {
  const [location, setLocation] = useState(null);
  const [locationName, setLocationName] = useState("");
  const [locationLoading, setLocationLoading] = useState(false);

  useEffect(() => {
    if (!navigator.geolocation) return undefined;

    let mounted = true;
    setLocationLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        if (!mounted) return;
        const nextLocation = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setLocation(nextLocation);

        try {
          await updateDriverLocation(nextLocation);
        } catch {
          // Best effort only.
        }

        try {
          const res = await reverseGeocode(nextLocation.lat, nextLocation.lng);
          if (mounted) setLocationName(res.data.placeName || "");
        } catch {
          if (mounted) setLocationName("");
        } finally {
          if (mounted) setLocationLoading(false);
        }
      },
      () => {
        if (mounted) setLocationLoading(false);
      },
      { timeout: 8000, maximumAge: 300000, enableHighAccuracy: true }
    );

    return () => {
      mounted = false;
    };
  }, []);

  return { location, locationName, locationLoading };
}
