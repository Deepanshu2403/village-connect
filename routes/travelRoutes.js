const express = require("express");
const {
  createTravelPost,
  getTravelPosts,
  getTravelPostById,
} = require("../controllers/travelController");
const auth = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", getTravelPosts);
router.get("/:id", auth, getTravelPostById);
router.post("/", auth, createTravelPost);

module.exports = router;
