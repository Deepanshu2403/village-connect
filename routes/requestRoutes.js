const express = require("express");
const {
  requestRide,
  acceptRequest,
  rejectRequest,
  deleteRequest,
  deletePassengerRequest,
  startTrip,
  markPickupDone,
  markDropDone,
} = require("../controllers/requestController");
const auth = require("../middleware/authMiddleware");
const asyncHandler = require("../middleware/asyncHandler");

const router = express.Router();

router.post("/", auth, asyncHandler(requestRide));
router.put("/accept", auth, asyncHandler(acceptRequest));
router.put("/reject", auth, asyncHandler(rejectRequest));
router.put("/start-trip", auth, asyncHandler(startTrip));
router.put("/pickup-done", auth, asyncHandler(markPickupDone));
router.put("/drop-done", auth, asyncHandler(markDropDone));
router.delete("/:requestId/delete", auth, asyncHandler(deletePassengerRequest));
router.delete("/:requestId", auth, asyncHandler(deleteRequest));

module.exports = router;
