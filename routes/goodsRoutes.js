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

router.post("/", auth, createGoodsRequest);
router.get("/", auth, getGoodsRequests);
router.put("/:id/accept", auth, acceptGoodsRequest);
router.put("/:id/purchased", auth, markGoodsPurchased);
router.put("/:id/in-transit", auth, markGoodsInTransit);
router.put("/:id/delivered", auth, markGoodsDelivered);
router.put("/:id/cancel", auth, cancelGoodsRequest);

module.exports = router;
