const prisma = require("../config/db");
const createNotification = require("../utils/createNotification");
const { emitToUser } = require("../utils/socketEmit");
const haversineKm = require("../utils/haversine");

const ITEM_CATEGORIES = [
  "medicine",
  "grocery",
  "electronics",
  "documents",
  "clothing",
  "other",
];
const QUANTITY_UNITS = ["items", "kg", "g", "packets", "litres"];

const toOptionalNumber = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const createItemRequest = async (req, res, next) => {
  try {
    const {
      itemName,
      quantity,
      quantityUnit,
      description,
      category,
      from,
      to,
      fromLat,
      fromLng,
      toLat,
      toLng,
      budget,
    } = req.body;

    if (!itemName || !from || !to) {
      return res.status(400).json({
        error: "Item name, pickup location and delivery location are required",
      });
    }

    const request = await prisma.itemRequest.create({
      data: {
        requesterId: req.user.userId,
        itemName: itemName.trim(),
        quantity: Number(quantity) || 1,
        quantityUnit: QUANTITY_UNITS.includes(quantityUnit) ? quantityUnit : "items",
        description: description?.trim() || null,
        category: ITEM_CATEGORIES.includes(category) ? category : "other",
        from: from.trim(),
        to: to.trim(),
        fromLat: toOptionalNumber(fromLat),
        fromLng: toOptionalNumber(fromLng),
        toLat: toOptionalNumber(toLat),
        toLng: toOptionalNumber(toLng),
        budget: toOptionalNumber(budget),
        status: "pending",
      },
      include: {
        requester: { select: { id: true, name: true, phone: true } },
      },
    });

    res.status(201).json({ success: true, request });
  } catch (err) {
    next(err);
  }
};

const getItemRequests = async (req, res, next) => {
  try {
    const { role, userId } = req.user;

    if (role === "passenger") {
      const requests = await prisma.itemRequest.findMany({
        where: { requesterId: userId },
        include: {
          acceptedBy: { select: { id: true, name: true, phone: true, rating: true } },
          travelPost: { select: { from: true, to: true, time: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      return res.json({ success: true, requests });
    }

    const driverLocation = await prisma.driverLocation
      .findUnique({
        where: { driverId: userId },
      })
      .catch(() => null);

    const allPending = await prisma.itemRequest.findMany({
      where: { status: "pending" },
      include: {
        requester: { select: { id: true, name: true, phone: true, rating: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    });

    let relevant = allPending;
    if (driverLocation) {
      relevant = allPending
        .map((request) => ({
          ...request,
          distanceKm:
            request.fromLat !== null && request.fromLng !== null
              ? Math.round(
                  haversineKm(
                    driverLocation.lat,
                    driverLocation.lng,
                    request.fromLat,
                    request.fromLng
                  ) * 10
                ) / 10
              : null,
        }))
        .filter((request) => request.distanceKm === null || request.distanceKm <= 15)
        .sort((a, b) => (a.distanceKm ?? 99) - (b.distanceKm ?? 99));
    }

    res.json({ success: true, requests: relevant });
  } catch (err) {
    next(err);
  }
};

const acceptItemRequest = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { travelPostId } = req.body;

    const request = await prisma.itemRequest.findUnique({
      where: { id },
      include: {
        requester: { select: { id: true } },
      },
    });

    if (!request) return res.status(404).json({ error: "Request not found" });
    if (request.status !== "pending") {
      return res.status(400).json({ error: "Request is no longer available" });
    }

    const driver = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { name: true, phone: true },
    });

    await prisma.itemRequest.update({
      where: { id },
      data: {
        status: "accepted",
        acceptedByDriver: req.user.userId,
        travelPostId: travelPostId ? Number(travelPostId) : null,
      },
    });

    await createNotification(
      request.requester.id,
      `Your item request "${request.itemName}" has been accepted by ${driver.name}. Contact: ${driver.phone}`,
      "/passenger",
      "item"
    );

    emitToUser(request.requester.id, "item:accepted", {
      requestId: id,
      itemName: request.itemName,
      driver: { name: driver.name, phone: driver.phone },
    });

    res.json({ success: true, message: "Item request accepted" });
  } catch (err) {
    next(err);
  }
};

const markItemPickedUp = async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    const request = await prisma.itemRequest.findUnique({
      where: { id },
      include: { requester: { select: { id: true } } },
    });

    if (!request) return res.status(404).json({ error: "Not found" });
    if (request.acceptedByDriver !== req.user.userId) {
      return res.status(403).json({ error: "Not your delivery" });
    }

    await prisma.itemRequest.update({
      where: { id },
      data: { status: "in_transit", pickedUpAt: new Date() },
    });

    await createNotification(
      request.requester.id,
      `"${request.itemName}" has been purchased and is on the way.`,
      "/passenger",
      "item"
    );

    emitToUser(request.requester.id, "item:in_transit", { requestId: id });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

const markItemDelivered = async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    const request = await prisma.itemRequest.findUnique({
      where: { id },
      include: { requester: { select: { id: true } } },
    });

    if (!request) return res.status(404).json({ error: "Not found" });
    if (request.acceptedByDriver !== req.user.userId) {
      return res.status(403).json({ error: "Not your delivery" });
    }

    await prisma.itemRequest.update({
      where: { id },
      data: { status: "delivered", deliveredAt: new Date() },
    });

    await createNotification(
      request.requester.id,
      `"${request.itemName}" has been delivered successfully.`,
      "/passenger",
      "item"
    );

    emitToUser(request.requester.id, "item:delivered", { requestId: id });

    res.json({ success: true, message: "Item delivered" });
  } catch (err) {
    next(err);
  }
};

const cancelItemRequest = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const userId = req.user.userId;

    const request = await prisma.itemRequest.findUnique({
      where: { id },
      include: {
        requester: { select: { id: true } },
        acceptedBy: { select: { id: true, name: true } },
      },
    });

    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }

    if (request.requesterId !== userId) {
      return res.status(403).json({ error: "Not your request" });
    }

    if (["in_transit", "delivered"].includes(request.status)) {
      return res.status(400).json({
        error: "Cannot cancel - item is already in transit or delivered",
      });
    }

    if (request.status === "pending") {
      await prisma.itemRequest.delete({ where: { id } });
      return res.json({ success: true, message: "Request deleted" });
    }

    if (request.status === "cancelled") {
      return res.status(400).json({ error: "Request already cancelled" });
    }

    await prisma.itemRequest.update({
      where: { id },
      data: { status: "cancelled" },
    });

    if (request.acceptedByDriver) {
      await createNotification(
        request.acceptedByDriver,
        `Passenger cancelled the item request for "${request.itemName}"`,
        "/driver",
        "item"
      );
    }

    res.json({ success: true, message: "Request cancelled" });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createItemRequest,
  getItemRequests,
  acceptItemRequest,
  markItemPickedUp,
  markItemDelivered,
  cancelItemRequest,
};
