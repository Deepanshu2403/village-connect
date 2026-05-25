const cron = require("node-cron");
const prisma = require("../config/db");

let isRunning = false;

const log = (message, meta = {}) => {
  console.log("[CRON cleanupRequests]", message, meta);
};

const logError = (message, err) => {
  console.error("[CRON cleanupRequests]", message, {
    error: err.message,
    stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
  });
};

const cleanupExpiredRideRequests = async () => {
  if (isRunning) {
    log("Skipped overlapping run");
    return { skipped: true };
  }

  isRunning = true;
  const startedAt = Date.now();
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
      log("Completed", { expired: 0, durationMs: Date.now() - startedAt });
      return { expired: 0 };
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

    log("Completed", {
      expired: expiredRequests.length,
      durationMs: Date.now() - startedAt,
    });

    return { expired: expiredRequests.length };
  } catch (err) {
    logError("Run failed", err);
    return { error: err.message };
  } finally {
    isRunning = false;
  }
};

const registerCleanupRequestsJob = () => {
  const task = cron.schedule("0 * * * *", () => {
    cleanupExpiredRideRequests().catch((err) => {
      logError("Unhandled run failure", err);
    });
  });

  log("Registered", { schedule: "0 * * * *" });
  return task;
};

module.exports = {
  cleanupExpiredRideRequests,
  registerCleanupRequestsJob,
};
