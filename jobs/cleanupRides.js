const cron = require("node-cron");
const prisma = require("../config/db");
const createNotification = require("../utils/createNotification");

let isRunning = false;

const log = (message, meta = {}) => {
  console.log("[CRON cleanupRides]", message, meta);
};

const logError = (message, err) => {
  console.error("[CRON cleanupRides]", message, {
    error: err.message,
    stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
  });
};

const notifyPassengers = async (rideRequests, messageBuilder, link, type) => {
  const results = await Promise.allSettled(
    rideRequests.map((request) =>
      createNotification(request.passenger.id, messageBuilder(request), link, type)
    )
  );

  const failed = results.filter((result) => result.status === "rejected").length;
  if (failed > 0) {
    log("Notification failures ignored", { failed });
  }
};

const cleanupRides = async () => {
  if (isRunning) {
    log("Skipped overlapping run");
    return { skipped: true };
  }

  isRunning = true;
  const startedAt = Date.now();
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

      await notifyPassengers(
        post.rideRequests,
        () =>
          `Your ride request for ${post.from} to ${post.to} expired because the trip departure time passed.`,
        "/home",
        "RIDE_EXPIRED"
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

    log("Completed", {
      expiredTrips: expiredPosts.length,
      staleRequests: stalePending.length,
      durationMs: Date.now() - startedAt,
    });

    return {
      expiredTrips: expiredPosts.length,
      staleRequests: stalePending.length,
    };
  } catch (err) {
    logError("Run failed", err);
    return { error: err.message };
  } finally {
    isRunning = false;
  }
};

const registerCleanupRidesJob = () => {
  const task = cron.schedule("*/30 * * * *", () => {
    cleanupRides().catch((err) => {
      logError("Unhandled run failure", err);
    });
  });

  log("Registered", { schedule: "*/30 * * * *" });
  return task;
};

module.exports = {
  cleanupRides,
  registerCleanupRidesJob,
};
