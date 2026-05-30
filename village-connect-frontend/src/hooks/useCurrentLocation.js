import { useCallback, useEffect, useRef, useState } from "react";
import API from "../api/client";

const geocodeCache = new Map();

async function reverseGeocodeCoords(lat, lng) {
  const key = `${lat.toFixed(3)},${lng.toFixed(3)}`;
  if (geocodeCache.has(key)) return geocodeCache.get(key);

  try {
    const res = await API.get("/travel/reverse-geocode", {
      params: { lat, lng },
    });
    const name = res.data.placeName || "";
    if (name) geocodeCache.set(key, name);
    return name;
  } catch {
    return "";
  }
}

export function useCurrentLocation() {
  const mountedRef = useRef(false);
  const [location, setLocation] = useState(null);
  const [locationName, setLocationName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const fetchLocation = useCallback(() => {
    if (!navigator.geolocation) {
      if (!mountedRef.current) return;
      setError("Geolocation not supported by your browser");
      setLoading(false);
      return;
    }

    if (!mountedRef.current) return;
    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        if (!mountedRef.current) return;
        const { latitude: lat, longitude: lng } = pos.coords;
        setLocation({ lat, lng });
        setPermissionDenied(false);

        const name = await reverseGeocodeCoords(lat, lng);
        if (!mountedRef.current) return;
        if (name) setLocationName(name);

        setLoading(false);

        try {
          await API.put("/location/driver", { lat, lng });
        } catch {
          // Best effort only. Location should never block the UI.
        }
      },
      (err) => {
        if (!mountedRef.current) return;
        if (err.code === 1) {
          setPermissionDenied(true);
          setError("Location permission denied");
        } else if (err.code === 2) {
          setError("Location unavailable");
        } else {
          setError("Location request timed out");
        }
        setLoading(false);
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 5 * 60 * 1000,
      }
    );
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    let permissionStatus = null;

    const handlePermissionChange = () => {
      if (!active || !permissionStatus) return;
      if (permissionStatus.state === "granted") {
        setPermissionDenied(false);
        fetchLocation();
      } else if (permissionStatus.state === "denied") {
        setPermissionDenied(true);
        setLoading(false);
      }
    };

    if (navigator.permissions?.query) {
      navigator.permissions
        .query({ name: "geolocation" })
        .then((result) => {
          if (!active) return;
          permissionStatus = result;
          if (result.state === "denied") {
            setPermissionDenied(true);
            setLoading(false);
          } else {
            fetchLocation();
          }
          result.addEventListener("change", handlePermissionChange);
        })
        .catch(() => {
          if (active) fetchLocation();
        });
    } else {
      fetchLocation();
    }

    return () => {
      active = false;
      permissionStatus?.removeEventListener("change", handlePermissionChange);
    };
  }, [fetchLocation]);

  return {
    location,
    locationName,
    loading,
    error,
    permissionDenied,
    refetch: fetchLocation,
  };
}
