const prisma = require("../config/db");
const haversineKm = require("../utils/haversine");

const withTripStats = (trip) => {
  const completedPassengers = (trip.rideRequests || []).filter(
    (request) => request.status === "completed"
  ).length;
  const durationMs =
    trip.startedAt && trip.completedAt
      ? new Date(trip.completedAt) - new Date(trip.startedAt)
      : null;

  return {
    ...trip,
    completedPassengers,
    durationMinutes: durationMs ? Math.round(durationMs / 60000) : null,
  };
};

const getDriverDashboard = async (req, res, next) => {
  try {
    const driverId = req.user.userId;
    const now = new Date();

    const scheduledPosts = await prisma.travelPost.findMany({
      where: {
        userId: driverId,
        status: "scheduled",
        time: { gt: now },
      },
      include: {
        rideRequests: {
          include: {
            passenger: {
              select: { id: true, name: true, phone: true, rating: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { time: "asc" },
    });

    const activePost = await prisma.travelPost.findFirst({
      where: {
        userId: driverId,
        status: { in: ["active", "pickup_done"] },
      },
      include: {
        rideRequests: {
          where: { status: { in: ["ongoing", "pickup_done"] } },
          include: {
            passenger: {
              select: { id: true, name: true, phone: true, rating: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { startedAt: "desc" },
    });

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const todayCompleted = await prisma.travelPost.findMany({
      where: {
        userId: driverId,
        status: "completed",
        completedAt: { gte: startOfDay },
      },
      include: {
        rideRequests: {
          where: { status: "completed" },
        },
      },
      orderBy: { completedAt: "desc" },
    });

    const [
      totalCompleted,
      totalPassengers,
      driverLocationRecord,
      allGoodsRequests,
      activeGoodsMatches,
      openItemRequests,
      activeItemDeliveries,
    ] = await Promise.all([
      prisma.travelPost.count({
        where: { userId: driverId, status: "completed" },
      }),
      prisma.rideRequest.count({
        where: {
          status: "completed",
          travelPost: { userId: driverId },
        },
      }),
      prisma.driverLocation.findUnique({
        where: { driverId },
      }).catch(() => null),
      prisma.goodsRequest.findMany({
        where: { status: "pending" },
        include: {
          requester: {
            select: { id: true, name: true, phone: true, rating: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.goodsMatch.findMany({
        where: {
          driverId,
          status: { in: ["accepted", "picked_up"] },
        },
        include: {
          goodsRequest: {
            include: {
              requester: { select: { id: true, name: true, phone: true, rating: true } },
            },
          },
          travelPost: {
            select: { id: true, from: true, to: true, fromLat: true, fromLng: true, toLat: true, toLng: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.itemRequest.findMany({
        where: { status: "pending" },
        include: {
          requester: {
            select: { id: true, name: true, phone: true, rating: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      }).catch(() => []),
      prisma.itemRequest.findMany({
        where: {
          acceptedByDriver: driverId,
          status: { in: ["accepted", "in_transit"] },
        },
        include: {
          requester: {
            select: { id: true, name: true, phone: true, rating: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }).catch(() => []),
    ]);

    let relevantGoodsRequests = allGoodsRequests;

    if (driverLocationRecord) {
      const { lat: driverLat, lng: driverLng } = driverLocationRecord;

      relevantGoodsRequests = allGoodsRequests
        .filter((goods) => {
          if (goods.fromLat !== null && goods.fromLng !== null) {
            return haversineKm(driverLat, driverLng, goods.fromLat, goods.fromLng) <= 10;
          }
          return true;
        })
        .map((goods) => ({
          ...goods,
          distanceKm:
            goods.fromLat !== null && goods.fromLng !== null
              ? Math.round(haversineKm(driverLat, driverLng, goods.fromLat, goods.fromLng) * 10) / 10
              : null,
        }));
    }

    const routeMatchedGoods = relevantGoodsRequests.filter((goods) =>
      scheduledPosts.some((post) => {
        const goodsFrom = goods.from.toLowerCase();
        const goodsTo = goods.to.toLowerCase();
        const postFrom = post.from.toLowerCase();
        const postTo = post.to.toLowerCase();
        const fromMatch = goodsFrom.includes(postFrom) || postFrom.includes(goodsFrom);
        const toMatch = goodsTo.includes(postTo) || postTo.includes(goodsTo);
        return fromMatch || toMatch;
      })
    );

    const openGoodsRequests =
      routeMatchedGoods.length > 0 ? routeMatchedGoods : relevantGoodsRequests.slice(0, 10);

    let relevantItemRequests = openItemRequests;
    if (driverLocationRecord) {
      const { lat: driverLat, lng: driverLng } = driverLocationRecord;

      relevantItemRequests = openItemRequests
        .map((request) => ({
          ...request,
          distanceKm:
            request.fromLat !== null && request.fromLng !== null
              ? Math.round(haversineKm(driverLat, driverLng, request.fromLat, request.fromLng) * 10) / 10
              : null,
        }))
        .filter((request) => request.distanceKm === null || request.distanceKm <= 15)
        .sort((a, b) => (a.distanceKm ?? 99) - (b.distanceKm ?? 99));
    }

    const pendingCount = scheduledPosts.reduce(
      (count, post) =>
        count +
        (post.rideRequests || []).filter((request) =>
          ["pending", "requested"].includes(request.status)
        ).length,
      0
    );

    res.json({
      success: true,
      activePost,
      scheduledPosts,
      todayCompleted: todayCompleted.map(withTripStats),
      openGoodsRequests,
      activeGoodsMatches,
      openItemRequests: relevantItemRequests,
      activeItemDeliveries,
      stats: {
        totalCompleted,
        totalPassengers,
        pendingCount,
        scheduledCount: scheduledPosts.length,
      },
      posts: [...(activePost ? [activePost] : []), ...scheduledPosts],
    });
  } catch (err) {
    next(err);
  }
};

const getDriverTripHistory = async (req, res, next) => {
  try {
    const driverId = req.user.userId;

    const completedTrips = await prisma.travelPost.findMany({
      where: {
        userId: driverId,
        status: { in: ["completed", "cancelled", "expired"] },
      },
      include: {
        rideRequests: {
          where: { status: { in: ["completed", "cancelled"] } },
          include: {
            passenger: {
              select: { id: true, name: true, phone: true, rating: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ success: true, trips: completedTrips.map(withTripStats) });
  } catch (err) {
    next(err);
  }
};

const acceptRideRequest = async (req, res, next) => {
  const { acceptRequest } = require("./requestController");
  return acceptRequest(req, res, next);
};

const rejectRideRequest = async (req, res, next) => {
  const { rejectRequest } = require("./requestController");
  return rejectRequest(req, res, next);
};

module.exports = {
  getDriverDashboard,
  getDriverTripHistory,
  acceptRideRequest,
  rejectRideRequest,
};
