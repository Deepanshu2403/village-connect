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

const router = express.Router();

router.post("/", auth, requestRide);
router.put("/accept", auth, acceptRequest);
router.put("/reject", auth, rejectRequest);
router.put("/start-trip", auth, startTrip);
router.put("/pickup-done", auth, markPickupDone);
router.put("/drop-done", auth, markDropDone);
router.delete("/:requestId/delete", auth, deletePassengerRequest);
router.delete("/:requestId", auth, deleteRequest);

module.exports = router;
