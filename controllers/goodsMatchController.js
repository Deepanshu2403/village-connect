const prisma = require("../config/db");
const createNotification = require("../utils/createNotification");
const { emitToUser } = require("../utils/socketEmit");

const createGoodsMatch = async (req, res, next) => {
  try {
    const { goodsRequestId } = req.body;
    const driverId = req.user.userId;

    if (!goodsRequestId) {
      return res.status(400).json({ error: "goodsRequestId is required" });
    }

    const activeTrip = await prisma.travelPost.findFirst({
      where: {
        userId: driverId,
        status: { in: ["active", "pickup_done"] },
      },
    });

    if (activeTrip) {
      return res.status(400).json({
        error: "You cannot accept goods delivery while a trip is in progress. Complete your current trip first.",
      });
    }

    const goodsRequest = await prisma.goodsRequest.findUnique({
      where: { id: Number(goodsRequestId) },
      include: {
        requester: { select: { id: true, name: true } },
      },
    });

    if (!goodsRequest) {
      return res.status(404).json({ error: "Goods request not found" });
    }

    if (goodsRequest.status !== "pending") {
      return res.status(400).json({ error: "This goods request is no longer available" });
    }

    const scheduledTrip = await prisma.travelPost.findFirst({
      where: {
        userId: driverId,
        status: "scheduled",
        time: { gt: new Date() },
      },
      orderBy: { time: "asc" },
    });

    const match = await prisma.goodsMatch.create({
      data: {
        goodsRequestId: Number(goodsRequestId),
        driverId,
        travelPostId: scheduledTrip?.id || null,
        status: "accepted",
      },
    });

    await prisma.goodsRequest.update({
      where: { id: Number(goodsRequestId) },
      data: {
        status: "accepted",
        driverId,
        travelPostId: scheduledTrip?.id || null,
      },
    });

    const driver = await prisma.user.findUnique({
      where: { id: driverId },
      select: { name: true, phone: true },
    });

    await createNotification(
      goodsRequest.requester.id,
      `Your goods request "${goodsRequest.item}" has been accepted by ${driver.name}. Contact: ${driver.phone}`,
      "/passenger",
      "goods"
    );

    res.status(201).json({ success: true, match });
  } catch (err) {
    next(err);
  }
};

const markGoodsPickup = async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    const match = await prisma.goodsMatch.findUnique({
      where: { id },
      include: {
        goodsRequest: {
          include: { requester: { select: { id: true } } },
        },
        driver: { select: { id: true, name: true } },
      },
    });

    if (!match) return res.status(404).json({ error: "Delivery not found" });
    if (match.driverId !== req.user.userId) {
      return res.status(403).json({ error: "Not your delivery" });
    }
    if (match.status !== "accepted") {
      return res.status(400).json({ error: "Delivery is not ready for pickup" });
    }

    await prisma.$transaction(async (tx) => {
      await tx.goodsMatch.update({
        where: { id },
        data: { status: "picked_up", pickedUpAt: new Date() },
      });
      await tx.goodsRequest.update({
        where: { id: match.goodsRequestId },
        data: { status: "in_transit" },
      });
    });

    await createNotification(
      match.goodsRequest.requester.id,
      `Driver ${match.driver.name} has picked up your goods. Track delivery.`,
      "/passenger",
      "goods"
    );

    emitToUser(match.goodsRequest.requester.id, "goods:picked_up", {
      matchId: id,
      goodsRequestId: match.goodsRequestId,
    });

    res.json({ success: true, message: "Goods picked up" });
  } catch (err) {
    next(err);
  }
};

const markGoodsDelivered = async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    const match = await prisma.goodsMatch.findUnique({
      where: { id },
      include: {
        goodsRequest: {
          include: { requester: { select: { id: true } } },
        },
        driver: { select: { id: true, name: true } },
      },
    });

    if (!match) return res.status(404).json({ error: "Delivery not found" });
    if (match.driverId !== req.user.userId) {
      return res.status(403).json({ error: "Not your delivery" });
    }
    if (!["accepted", "picked_up"].includes(match.status)) {
      return res.status(400).json({ error: "Delivery cannot be completed from this status" });
    }

    await prisma.$transaction(async (tx) => {
      await tx.goodsMatch.update({
        where: { id },
        data: { status: "delivered", deliveredAt: new Date() },
      });
      await tx.goodsRequest.update({
        where: { id: match.goodsRequestId },
        data: { status: "delivered" },
      });
    });

    await createNotification(
      match.goodsRequest.requester.id,
      "Your goods have been delivered successfully.",
      "/passenger",
      "goods"
    );

    emitToUser(match.goodsRequest.requester.id, "goods:delivered", {
      matchId: id,
      goodsRequestId: match.goodsRequestId,
    });

    res.json({ success: true, message: "Goods delivered successfully" });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createGoodsMatch,
  markGoodsPickup,
  markGoodsDelivered,
};
