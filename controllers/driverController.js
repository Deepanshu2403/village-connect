const prisma = require("../config/db");

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
          where: { status: "ongoing" },
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

    const [totalCompleted, totalPassengers] = await Promise.all([
      prisma.travelPost.count({
        where: { userId: driverId, status: "completed" },
      }),
      prisma.rideRequest.count({
        where: {
          status: "completed",
          travelPost: { userId: driverId },
        },
      }),
    ]);

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
