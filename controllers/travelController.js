const prisma = require("../config/db");
const haversineKm = require("../utils/haversine");

const toOptionalNumber = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const number = Number(value);
  return Number.isNaN(number) ? null : number;
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

    const post = await prisma.travelPost.create({
      data: {
        from,
        to,
        time: departureTime,
        seatsAvailable: seatsAvailable ? Number(seatsAvailable) : 0,
        canCarryGoods: Boolean(canCarryGoods),
        capacityKg: capacityKg ? Number(capacityKg) : 0,
        vehicleType,
        fromLat: toOptionalNumber(fromLat),
        fromLng: toOptionalNumber(fromLng),
        toLat: toOptionalNumber(toLat),
        toLng: toOptionalNumber(toLng),
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
      ? posts.filter((post) => {
          if (post.fromLat === null || post.fromLng === null) return false;
          return haversineKm(userLat, userLng, post.fromLat, post.fromLng) <= radiusKm;
        })
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

module.exports = { createTravelPost, getTravelPosts, getTravelPostById };
