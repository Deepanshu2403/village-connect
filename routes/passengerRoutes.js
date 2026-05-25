const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");
const {
  getPassengerDashboard,
  getPassengerTripHistory,
} = require("../controllers/passengerController");
const asyncHandler = require("../middleware/asyncHandler");

router.get("/dashboard", auth, asyncHandler(getPassengerDashboard));
router.get("/history", auth, asyncHandler(getPassengerTripHistory));

module.exports = router;
