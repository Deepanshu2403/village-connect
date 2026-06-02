const prisma = require("../config/db");
const createNotification = require("../utils/createNotification");
const haversineKm = require("../utils/haversine");
const { calculateFare } = require("../utils/fareCalculator");
const { calculateRouteSummary } = require("../utils/routing");
const { emitToUser } = require("../utils/socketEmit");

const placeSearchCache = new Map();
const reverseGeocodeCache = new Map();

const toOptionalNumber = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const number = Number(value);
  return Number.isNaN(number) ? null : number;
};

const mapNominatimResults = (data) =>
  data.map((item) => ({
    name:
      item.address?.village ||
      item.address?.town ||
      item.address?.city ||
      item.address?.suburb ||
      item.display_name?.split(",")[0] ||
      "Selected location",
    fullAddress: item.display_name,
    lat: parseFloat(item.lat),
    lng: parseFloat(item.lon),
    type: item.type,
  }));

const geocodePlace = async (query) => {
  const cleanQuery = String(query || "").trim();
  if (cleanQuery.length < 2) return null;

  const cacheKey = cleanQuery.toLowerCase();
  if (placeSearchCache.has(cacheKey)) {
    return placeSearchCache.get(cacheKey)[0] || null;
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cleanQuery)}&format=json&addressdetails=1&limit=5&countrycodes=in&accept-language=en`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "VillageConnect/1.0 (rural-transport-platform)",
        "Accept-Language": "en",
      },
    });
    if (!response.ok) return null;
    const results = mapNominatimResults(await response.json());
    placeSearchCache.set(cacheKey, results);
    return results[0] || null;
  } catch {
    return null;
  }
};

const createTravelPost = async (req, res, next) => {
  try {
    const {
      from,
      to,
      time,
      seatsAvailable,
      canCarryGoods,
      capacityKg,
      vehicleType,
      fromLat,
      fromLng,
      toLat,
      toLng,
      pickupLat,
      pickupLng,
      dropLat,
      dropLng,
    } = req.body;

    if (req.user.role !== "driver") {
      return res.status(403).json({
        success: false,
        error: "Only drivers can create travel posts",
      });
    }

    if (!from || !to || !time || !vehicleType) {
      return res.status(400).json({
        error: "from, to, time, vehicleType are required",
      });
    }

    const departureTime = new Date(time);
    if (Number.isNaN(departureTime.getTime()) || departureTime <= new Date()) {
      return res.status(400).json({ error: "Departure time must be in the future" });
    }

    const existingActiveTrip = await prisma.travelPost.findFirst({
      where: {
        userId: req.user.userId,
        OR: [
          { status: "scheduled", time: { gt: new Date() } },
          { status: { in: ["active", "pickup_done"] } },
        ],
      },
    });

    if (existingActiveTrip) {
      return res.status(400).json({
        error: "You already have an active trip. Complete or cancel it before posting a new one.",
        existingTripId: existingActiveTrip.id,
      });
    }

    let cleanFromLat = toOptionalNumber(fromLat ?? pickupLat);
    let cleanFromLng = toOptionalNumber(fromLng ?? pickupLng);
    let cleanToLat = toOptionalNumber(toLat ?? dropLat);
    let cleanToLng = toOptionalNumber(toLng ?? dropLng);

    if (cleanFromLat === null || cleanFromLng === null) {
      const pickup = await geocodePlace(from);
      cleanFromLat = pickup?.lat ?? cleanFromLat;
      cleanFromLng = pickup?.lng ?? cleanFromLng;
    }

    if (cleanToLat === null || cleanToLng === null) {
      const drop = await geocodePlace(to);
      cleanToLat = drop?.lat ?? cleanToLat;
      cleanToLng = drop?.lng ?? cleanToLng;
    }
    const routeSummary = await calculateRouteSummary(
      cleanFromLat,
      cleanFromLng,
      cleanToLat,
      cleanToLng,
      vehicleType
    );
    const estimatedFare =
      routeSummary.distanceKm !== null
        ? calculateFare(routeSummary.distanceKm, vehicleType)
        : null;

    const post = await prisma.travelPost.create({
      data: {
        from,
        to,
        time: departureTime,
        seatsAvailable: seatsAvailable ? Number(seatsAvailable) : 0,
        canCarryGoods: Boolean(canCarryGoods),
        capacityKg: capacityKg ? Number(capacityKg) : 0,
        vehicleType,
        estimatedFare,
        fromLat: cleanFromLat,
        fromLng: cleanFromLng,
        toLat: cleanToLat,
        toLng: cleanToLng,
        pickupLat: cleanFromLat,
        pickupLng: cleanFromLng,
        dropLat: cleanToLat,
        dropLng: cleanToLng,
        distanceKm: routeSummary.distanceKm,
        estimatedDuration: routeSummary.estimatedDuration,
        userId: req.user.userId,
      },
      include: {
        user: {
          select: { id: true, name: true, phone: true, rating: true },
        },
      },
    });

    res.status(201).json({ success: true, post });
  } catch (err) {
    next(err);
  }
};

const searchPlaces = async (req, res, next) => {
  try {
    const { q } = req.query;
    const query = String(q || "").trim();

    if (query.length < 2) {
      return res.json({ success: true, results: [] });
    }

    const cacheKey = query.toLowerCase();
    if (placeSearchCache.has(cacheKey)) {
      return res.json({ success: true, results: placeSearchCache.get(cacheKey) });
    }

    await new Promise((resolve) => setTimeout(resolve, 100));

    const headers = {
      "User-Agent": "VillageConnect/1.0 rural-transport-india contact@villageconnect.in",
      "Accept-Language": "en",
      Accept: "application/json",
    };

    const baseParams = new URLSearchParams({
      format: "jsonv2",
      addressdetails: "1",
      limit: "15",
      countrycodes: "in",
      "accept-language": "en",
      dedupe: "1",
    });

    const searches = await Promise.allSettled([
      fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&${baseParams}`,
        { headers }
      ).then((response) => (response.ok ? response.json() : [])),
      fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(`${query}, India`)}&${baseParams}`,
        { headers }
      ).then((response) => (response.ok ? response.json() : [])),
    ]);

    const combined = [];
    const seen = new Set();

    const processResults = (results) => {
      if (!Array.isArray(results)) return;

      for (const item of results) {
        const lat = parseFloat(item.lat);
        const lng = parseFloat(item.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

        const key = `${lat.toFixed(3)}-${lng.toFixed(3)}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const addr = item.address || {};
        const primaryName =
          addr.village ||
          addr.hamlet ||
          addr.neighbourhood ||
          addr.suburb ||
          addr.quarter ||
          addr.town ||
          addr.city ||
          addr.municipality ||
          item.name ||
          item.display_name?.split(",")[0];

        if (!primaryName || primaryName.length < 2) continue;
        if (/[\u0900-\u097F]/.test(primaryName)) continue;

        const contextParts = [
          addr.county || addr.state_district,
          addr.state,
        ].filter(Boolean);
        const context = [...new Set(contextParts)].join(", ");

        combined.push({
          name: primaryName,
          context,
          shortAddress: context,
          displayName: context ? `${primaryName}, ${context}` : primaryName,
          fullAddress: item.display_name,
          lat,
          lng,
          type: item.type || item.category,
          importance: parseFloat(item.importance) || 0,
        });
      }
    };

    for (const result of searches) {
      if (result.status === "fulfilled") processResults(result.value);
    }

    const results = combined
      .sort((a, b) => b.importance - a.importance)
      .filter(
        (item, index, items) =>
          items.findIndex((candidate) => candidate.displayName === item.displayName) === index
      )
      .slice(0, 10);

    placeSearchCache.set(cacheKey, results);
    res.json({ success: true, results });
  } catch (err) {
    next(err);
  }
};

const reverseGeocode = async (req, res, next) => {
  try {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ error: "lat and lng are required" });
    }

    const cacheKey = `${Number(lat).toFixed(5)},${Number(lng).toFixed(5)}`;
    if (reverseGeocodeCache.has(cacheKey)) {
      return res.json(reverseGeocodeCache.get(cacheKey));
    }

    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&addressdetails=1&accept-language=en`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "VillageConnect/1.0 (rural-transport-platform)",
        "Accept-Language": "en",
      },
    });

    if (!response.ok) {
      return res.status(502).json({ error: "Reverse geocoding unavailable" });
    }

    const data = await response.json();
    const addr = data.address || {};
    const town =
      addr.village ||
      addr.town ||
      addr.city ||
      addr.suburb ||
      addr.hamlet ||
      addr.county ||
      data.display_name?.split(",")[0];
    const state = addr.state || "";
    const placeName = state ? `${town}, ${state}` : town || "Unknown location";

    const payload = {
      success: true,
      placeName,
      town,
      state,
      fullAddress: data.display_name,
    };
    reverseGeocodeCache.set(cacheKey, payload);
    res.json(payload);
  } catch (err) {
    next(err);
  }
};

const calculateRoute = async (req, res, next) => {
  try {
    const { fromLat, fromLng, toLat, toLng, vehicleType } = req.query;

    if (!fromLat || !fromLng || !toLat || !toLng) {
      return res.status(400).json({ error: "All coordinates required" });
    }

    const routeSummary = await calculateRouteSummary(fromLat, fromLng, toLat, toLng, vehicleType);
    if (routeSummary.distanceKm === null) {
      return res.status(400).json({ error: "Valid coordinates required" });
    }
    const distanceKm = routeSummary.distanceKm;
    const durationMin = routeSummary.estimatedDuration;
    const estimatedFare = calculateFare(distanceKm, vehicleType);

    res.json({
      success: true,
      distanceKm,
      durationMin,
      estimatedFare,
      estimatedDuration: durationMin,
      geometry: routeSummary.geometry,
      source: routeSummary.source,
    });
  } catch (err) {
    next(err);
  }
};

const getTravelPosts = async (req, res, next) => {
  try {
    const { from, to, userLat, userLng } = req.query;
    const radiusKm = Number(req.query.radiusKm || 10);
    const hasLocationFilter = userLat !== undefined && userLng !== undefined;
    const now = new Date();

    const posts = await prisma.travelPost.findMany({
      where: {
        AND: [
          from ? { from: { contains: from, mode: "insensitive" } } : {},
          to ? { to: { contains: to, mode: "insensitive" } } : {},
          { time: { gt: now } },
          { status: "scheduled" },
        ],
      },
      include: {
        user: {
          select: { id: true, name: true, phone: true, rating: true },
        },
        _count: {
          select: { rideRequests: true },
        },
      },
      orderBy: { time: "asc" },
    });

    const filteredPosts = hasLocationFilter
      ? posts
          .map((post) => {
            if (post.fromLat === null || post.fromLng === null) return null;
            const distanceKm = haversineKm(userLat, userLng, post.fromLat, post.fromLng);
            if (distanceKm > radiusKm) return null;
            return { ...post, distanceKm: Math.round(distanceKm * 10) / 10 };
          })
          .filter(Boolean)
      : posts;

    res.json({ success: true, posts: filteredPosts });
  } catch (err) {
    next(err);
  }
};

const getTravelPostById = async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    const post = await prisma.travelPost.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, name: true, phone: true, rating: true },
        },
        rideRequests: {
          include: {
            passenger: {
              select: { id: true, name: true, phone: true, rating: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!post) {
      return res.status(404).json({ success: false, error: "Travel post not found" });
    }

    res.json({ success: true, post });
  } catch (err) {
    next(err);
  }
};

const cancelTrip = async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    const post = await prisma.travelPost.findUnique({
      where: { id },
      include: {
        rideRequests: {
          where: { status: { in: ["pending", "requested", "accepted"] } },
          include: { passenger: { select: { id: true } } },
        },
      },
    });

    if (!post) return res.status(404).json({ error: "Trip not found" });
    if (post.userId !== req.user.userId) {
      return res.status(403).json({ error: "Not your trip" });
    }
    if (post.status === "completed") {
      return res.status(400).json({ error: "Trip already completed" });
    }
    if (post.status === "cancelled") {
      return res.status(400).json({ error: "Trip already cancelled" });
    }

    await prisma.$transaction(async (tx) => {
      await tx.travelPost.update({
        where: { id },
        data: { status: "cancelled" },
      });
      await tx.rideRequest.updateMany({
        where: { travelPostId: id, status: { in: ["pending", "requested", "accepted"] } },
        data: { status: "cancelled" },
      });
    });

    for (const request of post.rideRequests) {
      await createNotification(
        request.passenger.id,
        `Trip ${post.from} to ${post.to} has been cancelled by the driver`,
        "/home",
        "ride"
      );
      emitToUser(request.passenger.id, "ride:cancelled", {
        travelPostId: id,
        from: post.from,
        to: post.to,
      });
      emitToUser(request.passenger.id, "dashboard:refresh", { reason: "trip_cancelled" });
    }

    emitToUser(req.user.userId, "dashboard:refresh", { reason: "trip_cancelled" });
    res.json({ success: true, message: "Trip cancelled" });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createTravelPost,
  getTravelPosts,
  getTravelPostById,
  searchPlaces,
  reverseGeocode,
  calculateRoute,
  cancelTrip,
};
