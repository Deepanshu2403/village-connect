const haversineKm = require("./haversine");

async function calculateRouteSummary(fromLat, fromLng, toLat, toLng, vehicleType) {
  const values = [fromLat, fromLng, toLat, toLng].map(Number);
  const hasCoordinates = values.every((value) => Number.isFinite(value));

  if (!hasCoordinates) {
    return { distanceKm: null, estimatedDuration: null, geometry: null, source: "none" };
  }

  const [startLat, startLng, endLat, endLng] = values;

  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${encodeURIComponent(startLng)},${encodeURIComponent(startLat)};${encodeURIComponent(endLng)},${encodeURIComponent(endLat)}?overview=full&geometries=geojson`;
    const response = await fetch(url, {
      headers: { "User-Agent": "VillageConnect/1.0" },
    });

    if (response.ok) {
      const data = await response.json();
      const route = data.routes?.[0];
      if (route) {
        return {
          distanceKm: Math.round(route.distance / 100) / 10,
          estimatedDuration: Math.round(route.duration / 60),
          geometry: route.geometry,
          source: "osrm",
        };
      }
    }
  } catch {
    // Weak connectivity fallback below.
  }

  const distanceKm = Math.round(haversineKm(startLat, startLng, endLat, endLng) * 10) / 10;
  return {
    distanceKm,
    estimatedDuration: Math.max(1, Math.round((distanceKm / 28) * 60)),
    geometry: null,
    source: "haversine",
  };
}

module.exports = { calculateRouteSummary };
