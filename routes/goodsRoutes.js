const express = require("express");
const router = express.Router();

const {
  createGoodsRequest,
  getGoodsRequests,
  acceptGoodsRequest,
  markGoodsPurchased,
  markGoodsInTransit,
  markGoodsDelivered,
  cancelGoodsRequest,
} = require("../controllers/goodsController");
const auth = require("../middleware/authMiddleware");
const asyncHandler = require("../middleware/asyncHandler");

router.post("/", auth, asyncHandler(createGoodsRequest));
router.get("/", auth, asyncHandler(getGoodsRequests));
router.put("/:id/accept", auth, asyncHandler(acceptGoodsRequest));
router.put("/:id/purchased", auth, asyncHandler(markGoodsPurchased));
router.put("/:id/in-transit", auth, asyncHandler(markGoodsInTransit));
router.put("/:id/delivered", auth, asyncHandler(markGoodsDelivered));
router.put("/:id/cancel", auth, asyncHandler(cancelGoodsRequest));

module.exports = router;
