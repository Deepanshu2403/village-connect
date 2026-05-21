const cron = require("node-cron");
const prisma = require("../config/db");

const cleanupExpiredRideRequests = async () => {
  const cutoff = new Date(Date.now() - 15 * 60 * 1000);

  try {
    const expiredRequests = await prisma.rideRequest.findMany({
      where: {
        status: { in: ["pending", "requested"] },
        createdAt: { lt: cutoff },
      },
      include: {
        passenger: { select: { id: true } },
        travelPost: { select: { from: true, to: true } },
      },
    });

    if (expiredRequests.length === 0) {
      console.log("[cleanupRequests] No expired ride requests found");
      return;
    }

    await prisma.$transaction(
      expiredRequests.flatMap((request) => [
        prisma.notification.create({
          data: {
            userId: request.passengerId,
            message: `Your ride request for ${request.travelPost.from} to ${request.travelPost.to} has expired because the driver did not respond in time`,
            type: "RIDE_EXPIRED",
            link: "/passenger",
          },
        }),
        prisma.rideRequest.update({
          where: { id: request.id },
          data: { status: "expired" },
        }),
      ])
    );

    console.log(`[cleanupRequests] Expired ${expiredRequests.length} ride request(s)`);
  } catch (error) {
    console.error("[cleanupRequests] Failed:", error.message);
  }
};

cron.schedule("0 * * * *", cleanupExpiredRideRequests);

module.exports = cleanupExpiredRideRequests;
