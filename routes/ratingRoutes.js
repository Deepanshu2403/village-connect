const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");
const { giveRating } = require("../controllers/ratingController");
const asyncHandler = require("../middleware/asyncHandler");

router.post("/", auth, asyncHandler(giveRating));

module.exports = router;
