const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");
const { giveRating } = require("../controllers/ratingController");

router.post("/", auth, giveRating);

module.exports = router;