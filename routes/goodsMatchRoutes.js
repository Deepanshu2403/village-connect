const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");
const {
  createGoodsMatch,
  markGoodsPickup,
  markGoodsDelivered,
} = require("../controllers/goodsMatchController");
const asyncHandler = require("../middleware/asyncHandler");

router.post("/", auth, asyncHandler(createGoodsMatch));
router.put("/:id/pickup", auth, asyncHandler(markGoodsPickup));
router.put("/:id/delivered", auth, asyncHandler(markGoodsDelivered));

module.exports = router;
