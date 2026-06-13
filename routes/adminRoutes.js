const express = require("express");
const adminMiddleware = require("../middleware/adminMiddleware");
const {
  getStats,
  getUsers,
  toggleSuspend,
  deleteUser,
  getRides,
  cancelRide,
  deleteRide,
  getGoods,
  deleteGoods,
  getBookings,
} = require("../controllers/adminController");
const asyncHandler = require("../middleware/asyncHandler");

const router = express.Router();

router.use(adminMiddleware);
router.get("/stats", asyncHandler(getStats));
router.get("/users", asyncHandler(getUsers));
router.put("/users/:id/suspend", asyncHandler(toggleSuspend));
router.delete("/users/:id", asyncHandler(deleteUser));
router.get("/rides", asyncHandler(getRides));
router.put("/rides/:id/cancel", asyncHandler(cancelRide));
router.delete("/rides/:id", asyncHandler(deleteRide));
router.get("/goods", asyncHandler(getGoods));
router.delete("/goods/:id", asyncHandler(deleteGoods));
router.get("/bookings", asyncHandler(getBookings));

module.exports = router;
