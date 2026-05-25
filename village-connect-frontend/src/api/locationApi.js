import API from "./client";

export const searchPlaces = (q) =>
  API.get("/travel/search-places", { params: { q } });

export const reverseGeocode = (lat, lng) =>
  API.get("/travel/reverse-geocode", { params: { lat, lng } });

export const updateDriverLocation = (data) =>
  API.put("/location/driver", data);

export const getDriverLocation = (driverId) =>
  API.get(`/location/driver/${driverId}`);

export const calculateRoute = (fromLat, fromLng, toLat, toLng, vehicleType) =>
  API.get("/travel/route", {
    params: { fromLat, fromLng, toLat, toLng, vehicleType },
  });
