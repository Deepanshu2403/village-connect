const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");
const {
  getDriverDashboard,
  getDriverTripHistory,
  acceptRideRequest,
  rejectRideRequest
} = require("../controllers/driverController");
const asyncHandler = require("../middleware/asyncHandler");

// Dashboard
router.get("/dashboard", auth, asyncHandler(getDriverDashboard));
router.get("/history", auth, asyncHandler(getDriverTripHistory));

// Actions
router.put("/accept", auth, asyncHandler(acceptRideRequest));
router.put("/reject", auth, asyncHandler(rejectRideRequest));

module.exports = router;
