const prisma = require("../config/db");
const createNotification = require("../utils/createNotification");

const createGoodsRequest = async (req, res, next) => {
  try {
    const { item, from, to, weightKg, note } = req.body;

    if (req.user.role !== "passenger") {
      return res.status(403).json({ error: "Only passengers can create goods requests" });
    }
    if (!item || !from || !to || !weightKg) {
      return res.status(400).json({ error: "item, from, to, weightKg are required" });
    }
    if (Number(weightKg) <= 0) {
      return res.status(400).json({ error: "Weight must be greater than 0" });
    }

    const request = await prisma.goodsRequest.create({
      data: {
        item: String(item).trim(),
        from: String(from).trim(),
        to: String(to).trim(),
        weightKg: Number(weightKg),
        note: note ? String(note).trim() : null,
        requesterId: req.user.userId,
        status: "pending",
      },
    });

    res.status(201).json({ success: true, request });
  } catch (err) {
    next(err);
  }
};

const getGoodsRequests = async (req, res, next) => {
  try {
    const where =
      req.user.role === "driver"
        ? { status: "pending" }
        : { requesterId: req.user.userId };

    const requests = await prisma.goodsRequest.findMany({
      where,
      include: {
        requester: { select: { id: true, name: true, phone: true, rating: true } },
        matches: {
          include: {
            driver: { select: { id: true, name: true, phone: true, rating: true } },
            travelPost: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ success: true, requests });
  } catch (err) {
    next(err);
  }
};

const updateGoodsStatus = (nextStatus) => async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const request = await prisma.goodsRequest.findUnique({
      where: { id },
      include: { requester: true },
    });

    if (!request) return res.status(404).json({ error: "Goods request not found" });

    const isRequester = request.requesterId === req.user.userId;
    const isDriver = request.driverId === req.user.userId;
    const canAccept = nextStatus === "accepted" && req.user.role === "driver" && !request.driverId;

    if (nextStatus === "cancelled" && !isRequester && request.driverId !== req.user.userId) {
      return res.status(403).json({ error: "Not allowed to cancel this goods request" });
    }

    if (nextStatus !== "cancelled" && !isDriver && !canAccept) {
      return res.status(403).json({ error: "Only the assigned driver can update this status" });
    }

    const data = { status: nextStatus };
    if (nextStatus === "accepted" && !request.driverId) {
      data.driverId = req.user.userId;
    }

    const updated = await prisma.goodsRequest.update({
      where: { id },
      data,
    });

    const notifyUserId = isRequester ? updated.driverId : updated.requesterId;
    if (notifyUserId) {
      await createNotification(
        notifyUserId,
        `Goods request ${updated.item} is now ${nextStatus.replace("_", " ")}`,
        isRequester ? "/driver" : "/passenger",
        "GOODS_STATUS"
      );
    }

    res.json({ success: true, request: updated });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createGoodsRequest,
  getGoodsRequests,
  acceptGoodsRequest: updateGoodsStatus("accepted"),
  markGoodsPurchased: updateGoodsStatus("purchased"),
  markGoodsInTransit: updateGoodsStatus("in_transit"),
  markGoodsDelivered: updateGoodsStatus("delivered"),
  cancelGoodsRequest: updateGoodsStatus("cancelled"),
};
