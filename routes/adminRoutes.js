const express = require("express");
const auth = require("../middleware/authMiddleware");
const admin = require("../middleware/adminMiddleware");
const {
  getAllUsers,
  suspendUser,
  getAllTrips,
  getStats,
} = require("../controllers/adminController");
const asyncHandler = require("../middleware/asyncHandler");

const router = express.Router();

router.use(auth, admin);
router.get("/users", asyncHandler(getAllUsers));
router.put("/users/:id/suspend", asyncHandler(suspendUser));
router.get("/trips", asyncHandler(getAllTrips));
router.get("/stats", asyncHandler(getStats));

module.exports = router;
