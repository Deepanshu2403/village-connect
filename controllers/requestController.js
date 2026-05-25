const prisma = require("../config/db");
const createNotification = require("../utils/createNotification");
const { emitToRide, emitToUser } = require("../utils/socketEmit");

const PENDING_STATUSES = ["pending", "requested"];
const ACTIVE_RIDE_STATUSES = ["accepted", "ongoing", "pickup_done"];

const requestRide = async (req, res, next) => {
  try {
    const travelPostId = Number(req.body.travelPostId);
    const passengerId = req.user.userId;

    if (req.user.role !== "passenger") {
      return res.status(403).json({ error: "Only passengers can request rides" });
    }

    const post = await prisma.travelPost.findUnique({
      where: { id: travelPostId },
      include: { user: { select: { id: true, name: true } } },
    });

    if (!post) return res.status(404).json({ error: "Travel post not found" });
    if (post.userId === passengerId) {
      return res.status(400).json({ error: "You cannot book your own ride" });
    }
    if (post.status !== "scheduled" || post.time <= new Date()) {
      return res.status(400).json({ error: "This ride is no longer available" });
    }
    if (post.seatsAvailable <= 0) {
      return res.status(400).json({ error: "No seats available" });
    }

    const activeRide = await prisma.rideRequest.findFirst({
      where: {
        passengerId,
        status: { in: ACTIVE_RIDE_STATUSES },
      },
    });

    if (activeRide) {
      return res.status(400).json({
        error: "You already have a confirmed ride. Complete your current ride before booking another.",
      });
    }

    const existing = await prisma.rideRequest.findFirst({
      where: {
        travelPostId,
        passengerId,
        status: { in: [...PENDING_STATUSES, ...ACTIVE_RIDE_STATUSES] },
      },
    });

    if (existing) {
      return res.status(400).json({ error: "You have already requested this ride" });
    }

    const passenger = await prisma.user.findUnique({
      where: { id: passengerId },
      select: { id: true, name: true },
    });

    let request;
    try {
      request = await prisma.rideRequest.create({
        data: { travelPostId, passengerId, status: "pending" },
      });
    } catch (error) {
      if (error.code === "P2002") {
        return res.status(400).json({ error: "You have already requested this ride" });
      }
      throw error;
    }

    await createNotification(
      post.userId,
      `New ride request from ${passenger?.name || "a passenger"} for ${post.from} to ${post.to}`,
      `/travel/${post.id}`,
      "RIDE_REQUEST"
    );

    emitToUser(post.userId, "ride:new_request", {
      passengerName: passenger?.name || "A passenger",
      travelPostId: Number(travelPostId),
      from: post.from,
      to: post.to,
    });

    res.status(201).json({ success: true, request });
  } catch (err) {
    next(err);
  }
};

const acceptRequest = async (req, res, next) => {
  try {
    const requestId = Number(req.body.requestId);

    const result = await prisma.$transaction(async (tx) => {
      const request = await tx.rideRequest.findUnique({
        where: { id: requestId },
        include: {
          passenger: { select: { id: true } },
          travelPost: {
            include: { user: { select: { id: true, name: true, phone: true } } },
          },
        },
      });

      if (!request) throw Object.assign(new Error("Request not found"), { statusCode: 404 });
      if (request.travelPost.userId !== req.user.userId) {
        throw Object.assign(new Error("Unauthorized"), { statusCode: 403 });
      }
      if (!PENDING_STATUSES.includes(request.status)) {
        throw Object.assign(new Error("Request already processed"), { statusCode: 400 });
      }
      if (request.travelPost.status !== "scheduled" || request.travelPost.time <= new Date()) {
        throw Object.assign(new Error("This trip is no longer accepting requests"), { statusCode: 400 });
      }
      if (request.travelPost.seatsAvailable <= 0) {
        throw Object.assign(new Error("No seats available"), { statusCode: 400 });
      }
      const passengerActiveRide = await tx.rideRequest.findFirst({
        where: {
          passengerId: request.passengerId,
          id: { not: request.id },
          status: { in: ACTIVE_RIDE_STATUSES },
        },
      });
      if (passengerActiveRide) {
        throw Object.assign(new Error("Passenger already has an active ride"), { statusCode: 400 });
      }

      await tx.rideRequest.update({
        where: { id: requestId },
        data: { status: "accepted" },
      });

      const updatedPost = await tx.travelPost.update({
        where: { id: request.travelPostId },
        data: { seatsAvailable: { decrement: 1 } },
      });

      const acceptedNotification = await tx.notification.create({
        data: {
          userId: request.passengerId,
          message: `Your ride request for ${request.travelPost.from} to ${request.travelPost.to} has been accepted. Driver: ${request.travelPost.user.name}, Phone: ${request.travelPost.user.phone}`,
          type: "RIDE_ACCEPTED",
          link: "/passenger",
        },
      });

      let autoRejectedCount = 0;
      if (updatedPost.seatsAvailable === 0) {
        const otherRequests = await tx.rideRequest.findMany({
          where: {
            travelPostId: request.travelPostId,
            status: { in: PENDING_STATUSES },
            id: { not: requestId },
          },
          select: { id: true, passengerId: true },
        });

        if (otherRequests.length > 0) {
          await tx.rideRequest.updateMany({
            where: { id: { in: otherRequests.map((item) => item.id) } },
            data: { status: "rejected" },
          });

          await tx.notification.createMany({
            data: otherRequests.map((item) => ({
              userId: item.passengerId,
              message: `Sorry, the trip ${request.travelPost.from} to ${request.travelPost.to} is now full`,
              type: "TRIP_FULL",
              link: "/home",
            })),
          });
          autoRejectedCount = otherRequests.length;
        }
      }

      return { request, updatedPost, autoRejectedCount, acceptedNotification };
    });

    emitToUser(result.request.passenger.id, "notification:new", result.acceptedNotification);
    emitToUser(result.request.passenger.id, "dashboard:refresh", { reason: "ride_accepted" });

    emitToUser(result.request.passenger.id, "ride:accepted", {
      requestId: Number(requestId),
      travelPostId: result.request.travelPostId,
      driver: {
        id: result.request.travelPost.user.id,
        name: result.request.travelPost.user.name,
        phone: result.request.travelPost.user.phone,
      },
      post: {
        from: result.request.travelPost.from,
        to: result.request.travelPost.to,
        time: result.request.travelPost.time,
        vehicleType: result.request.travelPost.vehicleType,
      },
    });

    emitToRide(result.request.travelPostId, "ride:updated", {
      type: "request_accepted",
      requestId: Number(requestId),
    });
    emitToUser(req.user.userId, "dashboard:refresh", { reason: "request_accepted" });

    res.json({
      success: true,
      message: "Request accepted",
      travelPost: result.updatedPost,
      autoRejectedCount: result.autoRejectedCount,
    });
  } catch (err) {
    next(err);
  }
};

const rejectRequest = async (req, res, next) => {
  try {
    const requestId = Number(req.body.requestId);
    const request = await prisma.rideRequest.findUnique({
      where: { id: requestId },
      include: { passenger: { select: { id: true } }, travelPost: true },
    });

    if (!request) return res.status(404).json({ error: "Request not found" });
    if (request.travelPost.userId !== req.user.userId) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    if (!PENDING_STATUSES.includes(request.status)) {
      return res.status(400).json({ error: "Request already processed" });
    }

    await prisma.rideRequest.update({
      where: { id: requestId },
      data: { status: "rejected" },
    });

    await createNotification(
      request.passengerId,
      `Your ride request for ${request.travelPost.from} to ${request.travelPost.to} was not accepted`,
      "/passenger",
      "RIDE_REJECTED"
    );

    emitToUser(request.passenger.id, "ride:rejected", {
      requestId: Number(requestId),
      from: request.travelPost.from,
      to: request.travelPost.to,
    });

    res.json({ success: true, message: "Request rejected" });
  } catch (err) {
    next(err);
  }
};

const deleteRequest = async (req, res, next) => {
  try {
    const requestId = Number(req.params.requestId);
    const request = await prisma.rideRequest.findUnique({
      where: { id: requestId },
      include: { travelPost: true },
    });

    if (!request) return res.status(404).json({ error: "Request not found" });
    if (request.travelPost.userId !== req.user.userId) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    if (![...PENDING_STATUSES, "rejected", "expired"].includes(request.status)) {
      return res.status(400).json({ error: "Accepted requests cannot be deleted" });
    }

    await prisma.$transaction([
      prisma.rideRequest.delete({ where: { id: requestId } }),
      prisma.notification.create({
        data: {
          userId: request.passengerId,
          message: `Your ride request for ${request.travelPost.from} to ${request.travelPost.to} has been removed by the driver`,
          type: "RIDE_REMOVED",
          link: "/passenger",
        },
      }),
    ]);

    res.json({ success: true, message: "Request deleted" });
  } catch (err) {
    next(err);
  }
};

const deletePassengerRequest = async (req, res, next) => {
  try {
    const requestId = Number(req.params.requestId);

    const request = await prisma.rideRequest.findUnique({
      where: { id: requestId },
      include: {
        travelPost: {
          include: { user: { select: { id: true } } },
        },
      },
    });

    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }

    if (request.passengerId !== req.user.userId) {
      return res.status(403).json({ error: "Not your request" });
    }

    if ([...ACTIVE_RIDE_STATUSES, "completed"].includes(request.status)) {
      return res.status(400).json({
        error: "Cannot delete an active or completed ride. Use cancel instead.",
      });
    }

    await prisma.rideRequest.delete({ where: { id: requestId } });

    if (PENDING_STATUSES.includes(request.status)) {
      await createNotification(
        request.travelPost.user.id,
        `A passenger withdrew their request for ${request.travelPost.from} to ${request.travelPost.to}`,
        `/travel/${request.travelPost.id}`,
        "REQUEST_WITHDRAWN"
      );
    }

    emitToUser(request.travelPost.user.id, "dashboard:refresh", { reason: "request_deleted" });

    res.json({ success: true, message: "Request removed" });
  } catch (err) {
    next(err);
  }
};

const startTrip = async (req, res, next) => {
  try {
    const travelPostId = Number(req.body.travelPostId);
    const post = await prisma.travelPost.findUnique({
      where: { id: travelPostId },
      include: {
        user: { select: { id: true, name: true, phone: true } },
        rideRequests: {
          where: { status: "accepted" },
          include: { passenger: { select: { id: true } } },
        },
      },
    });

    if (!post) return res.status(404).json({ error: "Trip not found" });
    if (post.userId !== req.user.userId) return res.status(403).json({ error: "Not your trip" });
    if (post.status !== "scheduled") return res.status(400).json({ error: "Trip must be scheduled" });
    const activeTrip = await prisma.travelPost.findFirst({
      where: {
        userId: req.user.userId,
        id: { not: travelPostId },
        status: { in: ["active", "pickup_done"] },
      },
    });
    if (activeTrip) return res.status(400).json({ error: "Complete your active trip first" });
    if (post.rideRequests.length === 0) {
      return res.status(400).json({ error: "No accepted passengers to start this trip" });
    }

    await prisma.$transaction(async (tx) => {
      const now = new Date();
      await tx.travelPost.update({
        where: { id: travelPostId },
        data: { status: "active", startedAt: now },
      });
      await tx.rideRequest.updateMany({
        where: { travelPostId, status: "accepted" },
        data: { status: "ongoing" },
      });
    });

    for (const request of post.rideRequests) {
      emitToUser(request.passenger.id, "ride:started", {
        travelPostId,
        from: post.from,
        to: post.to,
        driver: { name: post.user.name, phone: post.user.phone },
      });
    }
    emitToRide(travelPostId, "ride:started", { travelPostId });
    emitToUser(req.user.userId, "dashboard:refresh", { reason: "trip_started" });

    res.json({ success: true, message: "Trip started" });
  } catch (err) {
    next(err);
  }
};

const markPickupDone = async (req, res, next) => {
  try {
    const travelPostId = Number(req.body.travelPostId);
    const post = await prisma.travelPost.findUnique({
      where: { id: travelPostId },
      include: {
        rideRequests: {
          where: { status: "ongoing" },
          include: { passenger: { select: { id: true } } },
        },
      },
    });

    if (!post) return res.status(404).json({ error: "Trip not found" });
    if (post.userId !== req.user.userId) return res.status(403).json({ error: "Not your trip" });
    if (post.status !== "active") return res.status(400).json({ error: "Trip must be active" });

    await prisma.$transaction(async (tx) => {
      const now = new Date();
      await tx.travelPost.update({
        where: { id: travelPostId },
        data: { status: "pickup_done", pickedUpAt: now },
      });
      await tx.rideRequest.updateMany({
        where: { travelPostId, status: "ongoing" },
        data: { status: "pickup_done", pickupConfirmed: true, pickedUpAt: now },
      });
    });

    await Promise.all(
      post.rideRequests.map((request) =>
        createNotification(
          request.passenger.id,
          `Driver has confirmed your pickup for ${post.from} to ${post.to}. Enjoy your ride!`,
          "/passenger",
          "PICKUP_DONE"
        )
      )
    );

    for (const request of post.rideRequests) {
      emitToUser(request.passenger.id, "ride:updated", {
        type: "pickup_done",
        travelPostId,
        from: post.from,
        to: post.to,
      });
    }
    emitToRide(travelPostId, "ride:updated", { type: "pickup_done", travelPostId });
    emitToUser(req.user.userId, "dashboard:refresh", { reason: "pickup_done" });

    res.json({ success: true, message: "Pickup confirmed" });
  } catch (err) {
    next(err);
  }
};

const markDropDone = async (req, res, next) => {
  try {
    const travelPostId = Number(req.body.travelPostId);
    const post = await prisma.travelPost.findUnique({
      where: { id: travelPostId },
      include: {
        rideRequests: {
          where: { status: { in: ["ongoing", "pickup_done"] } },
          include: { passenger: { select: { id: true } } },
        },
        user: { select: { id: true, name: true } },
      },
    });

    if (!post) return res.status(404).json({ error: "Trip not found" });
    if (post.userId !== req.user.userId) return res.status(403).json({ error: "Not your trip" });
    if (!["active", "pickup_done"].includes(post.status)) {
      return res.status(400).json({ error: "Invalid trip state" });
    }

    await prisma.$transaction(async (tx) => {
      const now = new Date();
      await tx.travelPost.update({
        where: { id: travelPostId },
        data: { status: "completed", droppedAt: now, completedAt: now },
      });
      await tx.rideRequest.updateMany({
        where: { travelPostId, status: { in: ["ongoing", "pickup_done"] } },
        data: { status: "completed", dropConfirmed: true, droppedAt: now },
      });
    });

    await Promise.all(
      post.rideRequests.map((request) =>
        createNotification(
          request.passenger.id,
          `You have been dropped off. Trip ${post.from} to ${post.to} is complete. Please rate your driver.`,
          `/rate/${post.userId}/${post.id}`,
          "DROP_DONE"
        )
      )
    );

    for (const request of post.rideRequests) {
      emitToUser(request.passenger.id, "ride:completed", {
        travelPostId,
        from: post.from,
        to: post.to,
      });
    }
    emitToRide(travelPostId, "ride:completed", { travelPostId });
    emitToUser(req.user.userId, "dashboard:refresh", { reason: "trip_completed" });

    res.json({ success: true, message: "Drop confirmed, trip completed" });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  requestRide,
  acceptRequest,
  rejectRequest,
  deleteRequest,
  deletePassengerRequest,
  startTrip,
  markPickupDone,
  markDropDone,
};
