const express = require("express");
const auth = require("../middleware/authMiddleware");
const asyncHandler = require("../middleware/asyncHandler");
const {
  createItemRequest,
  getItemRequests,
  acceptItemRequest,
  markItemPickedUp,
  markItemDelivered,
  cancelItemRequest,
} = require("../controllers/itemRequestController");

const router = express.Router();

router.post("/", auth, asyncHandler(createItemRequest));
router.get("/", auth, asyncHandler(getItemRequests));
router.put("/:id/accept", auth, asyncHandler(acceptItemRequest));
router.put("/:id/picked-up", auth, asyncHandler(markItemPickedUp));
router.put("/:id/delivered", auth, asyncHandler(markItemDelivered));
router.put("/:id/cancel", auth, asyncHandler(cancelItemRequest));

module.exports = router;
