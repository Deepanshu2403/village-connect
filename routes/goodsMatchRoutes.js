const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");
const { createGoodsMatch } = require("../controllers/goodsMatchController");
const asyncHandler = require("../middleware/asyncHandler");

router.post("/", auth, asyncHandler(createGoodsMatch));

module.exports = router;
