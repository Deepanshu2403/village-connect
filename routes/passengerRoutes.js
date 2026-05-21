const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");
const {
  getPassengerDashboard,
  getPassengerTripHistory,
} = require("../controllers/passengerController");

router.get("/dashboard", auth, getPassengerDashboard);
router.get("/history", auth, getPassengerTripHistory);

module.exports = router;
