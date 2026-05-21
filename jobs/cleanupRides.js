const cron = require("node-cron");
const prisma = require("../config/db");
const createNotification = require("../utils/createNotification");

const cleanupRides = async () => {
  const now = new Date();
  const expiredTripCutoff = new Date(now.getTime() - 30 * 60 * 1000);
  const fifteenMinsAgo = new Date(now.getTime() - 15 * 60 * 1000);

  try {
    const expiredPosts = await prisma.travelPost.findMany({
      where: {
        status: "scheduled",
        time: { lt: expiredTripCutoff },
      },
      include: {
        rideRequests: {
          where: { status: { in: ["pending", "requested", "accepted"] } },
          include: { passenger: { select: { id: true } } },
        },
      },
    });

    for (const post of expiredPosts) {
      await prisma.$transaction([
        prisma.travelPost.update({
          where: { id: post.id },
          data: { status: "expired" },
        }),
        prisma.rideRequest.updateMany({
          where: { travelPostId: post.id, status: { in: ["pending", "requested", "accepted"] } },
          data: { status: "expired" },
        }),
      ]);

      await Promise.all(
        post.rideRequests.map((request) =>
          createNotification(
            request.passenger.id,
            `Your ride request for ${post.from} to ${post.to} expired because the trip departure time passed.`,
            "/home",
            "RIDE_EXPIRED"
          )
        )
      );
    }

    const stalePending = await prisma.rideRequest.findMany({
      where: {
        status: { in: ["pending", "requested"] },
        createdAt: { lt: fifteenMinsAgo },
        travelPost: {
          status: "scheduled",
          time: { gt: now },
        },
      },
      include: {
        travelPost: { select: { from: true, to: true, userId: true } },
        passenger: { select: { id: true } },
      },
    });

    for (const request of stalePending) {
      await prisma.rideRequest.update({
        where: { id: request.id },
        data: { status: "expired" },
      });
      await createNotification(
        request.passenger.id,
        `Your ride request for ${request.travelPost.from} to ${request.travelPost.to} expired. The driver did not respond in time.`,
        "/home",
        "REQUEST_TIMEOUT"
      );
    }

    if (expiredPosts.length || stalePending.length) {
      console.log(
        `[cleanupRides] Expired ${expiredPosts.length} trip(s), ${stalePending.length} stale request(s)`
      );
    }
  } catch (error) {
    console.error("[cleanupRides] Failed:", error.message);
  }
};

cron.schedule("*/30 * * * *", cleanupRides);

module.exports = cleanupRides;
