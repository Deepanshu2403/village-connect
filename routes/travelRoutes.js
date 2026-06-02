const express = require("express");
const {
  createTravelPost,
  getTravelPosts,
  getTravelPostById,
  searchPlaces,
  reverseGeocode,
  calculateRoute,
  cancelTrip,
} = require("../controllers/travelController");
const auth = require("../middleware/authMiddleware");
const asyncHandler = require("../middleware/asyncHandler");

const router = express.Router();

router.get("/", asyncHandler(getTravelPosts));
router.get("/search-places", asyncHandler(searchPlaces));
router.get("/reverse-geocode", asyncHandler(reverseGeocode));
router.get("/route", asyncHandler(calculateRoute));
router.get("/:id", auth, asyncHandler(getTravelPostById));
router.post("/", auth, asyncHandler(createTravelPost));
router.put("/:id/cancel", auth, asyncHandler(cancelTrip));

module.exports = router;
