const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");
const {
  getDriverDashboard,
  getDriverTripHistory,
  acceptRideRequest,
  rejectRideRequest
} = require("../controllers/driverController");

// Dashboard
router.get("/dashboard", auth, getDriverDashboard);
router.get("/history", auth, getDriverTripHistory);

// Actions
router.put("/accept", auth, acceptRideRequest);
router.put("/reject", auth, rejectRideRequest);

module.exports = router;
