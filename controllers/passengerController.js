const prisma = require("../config/db");

const withExpiresAt = (request) => ({
  ...request,
  expiresAt: new Date(new Date(request.createdAt).getTime() + 15 * 60 * 1000),
});

const withDuration = (request) => ({
  ...request,
  durationMinutes:
    request.pickedUpAt && request.droppedAt
      ? Math.round((new Date(request.droppedAt) - new Date(request.pickedUpAt)) / 60000)
      : null,
});

const rideInclude = {
  travelPost: {
    include: {
      user: {
        select: {
          id: true,
          name: true,
          phone: true,
          rating: true,
          totalRatings: true,
        },
      },
    },
  },
};

const getPassengerDashboard = async (req, res, next) => {
  try {
    const passengerId = req.user.userId;

    const [activeRide, confirmedRides, pendingRides, goodsRequests, rides] =
      await Promise.all([
        prisma.rideRequest.findFirst({
          where: { passengerId, status: "ongoing" },
          include: rideInclude,
          orderBy: { createdAt: "desc" },
        }),
        prisma.rideRequest.findMany({
          where: { passengerId, status: "accepted" },
          include: rideInclude,
          orderBy: { createdAt: "desc" },
        }),
        prisma.rideRequest.findMany({
          where: { passengerId, status: { in: ["pending", "requested"] } },
          include: rideInclude,
          orderBy: { createdAt: "desc" },
        }),
        prisma.goodsRequest.findMany({
          where: { requesterId: passengerId },
          include: {
            matches: {
              include: {
                driver: {
                  select: {
                    id: true,
                    name: true,
                    phone: true,
                    rating: true,
                  },
                },
                travelPost: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.rideRequest.findMany({
          where: { passengerId },
          include: rideInclude,
          orderBy: { createdAt: "desc" },
        }),
      ]);

    const recentlyCompleted = await prisma.rideRequest.findFirst({
      where: {
        passengerId,
        status: "completed",
        droppedAt: { gt: new Date(Date.now() - 2 * 60 * 60 * 1000) },
      },
      include: rideInclude,
      orderBy: { droppedAt: "desc" },
    });

    let recentlyCompletedWithRating = null;
    if (recentlyCompleted) {
      const existingRating = await prisma.rating.findFirst({
        where: {
          raterId: passengerId,
          travelPostId: recentlyCompleted.travelPostId,
        },
      });

      recentlyCompletedWithRating = {
        ...withDuration(recentlyCompleted),
        hasRated: Boolean(existingRating),
      };
    }

    res.json({
      success: true,
      activeRide: activeRide ? withDuration(activeRide) : null,
      confirmedRides,
      pendingRides: pendingRides.map(withExpiresAt),
      goodsRequests,
      recentlyCompleted: recentlyCompletedWithRating,
      rides: rides.map((ride) => withExpiresAt(withDuration(ride))),
      goods: goodsRequests,
    });
  } catch (err) {
    next(err);
  }
};

const getPassengerTripHistory = async (req, res, next) => {
  try {
    const passengerId = req.user.userId;

    const completedRides = await prisma.rideRequest.findMany({
      where: {
        passengerId,
        status: { in: ["completed", "cancelled", "expired", "rejected"] },
      },
      include: rideInclude,
      orderBy: { createdAt: "desc" },
    });

    const ratedTripIds = await prisma.rating.findMany({
      where: { raterId: passengerId },
      select: { travelPostId: true },
    });

    const ratedSet = new Set(ratedTripIds.map((rating) => rating.travelPostId));

    const ridesWithRatingStatus = completedRides.map((ride) => ({
      ...withDuration(ride),
      hasRated: ratedSet.has(ride.travelPostId),
    }));

    res.json({ success: true, rides: ridesWithRatingStatus });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getPassengerDashboard,
  getPassengerTripHistory,
};
