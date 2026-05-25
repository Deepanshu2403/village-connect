const express = require("express");
const {
  createTravelPost,
  getTravelPosts,
  getTravelPostById,
} = require("../controllers/travelController");
const auth = require("../middleware/authMiddleware");
const asyncHandler = require("../middleware/asyncHandler");

const router = express.Router();

router.get("/", asyncHandler(getTravelPosts));
router.get("/:id", auth, asyncHandler(getTravelPostById));
router.post("/", auth, asyncHandler(createTravelPost));

module.exports = router;
