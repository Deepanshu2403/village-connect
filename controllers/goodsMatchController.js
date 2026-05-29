const prisma = require("../config/db");
const createNotification = require("../utils/createNotification");
const { emitToUser } = require("../utils/socketEmit");

const createGoodsMatch = async (req, res, next) => {
  try {
    const goodsRequestId = Number(req.body.goodsRequestId);
    const travelPostId = Number(req.body.travelPostId);

    const goodsRequest = await prisma.goodsRequest.findUnique({
      where: { id: goodsRequestId },
    });

    if (!goodsRequest) {
      return res.status(404).json({
        success: false,
        error: "Goods request not found",
      });
    }

    const travelPost = await prisma.travelPost.findUnique({
      where: { id: travelPostId },
    });

    if (!travelPost || travelPost.userId !== req.user.userId) {
      return res.status(403).json({
        success: false,
        error: "You can only offer delivery from your own travel post",
      });
    }

    const match = await prisma.goodsMatch.create({
      data: {
        goodsRequestId,
        travelPostId,
        driverId: req.user.userId,
        status: "accepted",
      },
    });

    await prisma.goodsRequest.update({
      where: { id: goodsRequestId },
      data: {
        status: "accepted",
        driverId: req.user.userId,
        travelPostId,
      },
    });

    await createNotification(
      goodsRequest.requesterId,
      `Your goods delivery request for ${goodsRequest.item} (${goodsRequest.from} → ${goodsRequest.to}) has been accepted`,
      "/passenger",
      "GOODS_MATCH"
    );

    res.json({ success: true, match });
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
