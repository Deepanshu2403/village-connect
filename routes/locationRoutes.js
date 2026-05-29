const express = require("express");
const prisma = require("../config/db");
const auth = require("../middleware/authMiddleware");
const asyncHandler = require("../middleware/asyncHandler");

const router = express.Router();

router.put(
  "/driver",
  auth,
  asyncHandler(async (req, res) => {
    const lat = Number(req.body.lat);
    const lng = Number(req.body.lng);
    const travelPostId = req.body.travelPostId ? Number(req.body.travelPostId) : null;

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ error: "Valid lat and lng are required" });
    }

    const location = await prisma.driverLocation.upsert({
      where: { driverId: req.user.userId },
      update: { lat, lng, travelPostId },
      create: {
        driverId: req.user.userId,
        lat,
        lng,
        travelPostId,
      },
    });

    res.json({ success: true, location });
  })
);

router.get(
  "/driver/:driverId",
  auth,
  asyncHandler(async (req, res) => {
    const driverId = Number(req.params.driverId);
    if (!Number.isFinite(driverId)) {
      return res.status(400).json({ error: "Valid driver id is required" });
    }

    const location = await prisma.driverLocation.findUnique({
      where: { driverId },
    });

    res.json({ success: true, location });
  })
);

module.exports = router;
