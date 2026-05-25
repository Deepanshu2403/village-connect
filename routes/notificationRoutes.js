const express = require("express");
const auth = require("../middleware/authMiddleware");
const {
  getNotifications,
  markOneRead,
  markAllRead,
  deleteNotification,
  clearAllNotifications,
  clearReadNotifications,
} = require("../controllers/notificationController");
const asyncHandler = require("../middleware/asyncHandler");

const router = express.Router();

router.get("/", auth, asyncHandler(getNotifications));
router.put("/read", auth, asyncHandler(markOneRead));
router.put("/read-all", auth, asyncHandler(markAllRead));
router.delete("/clear-all", auth, asyncHandler(clearAllNotifications));
router.delete("/clear-read", auth, asyncHandler(clearReadNotifications));
router.delete("/:id", auth, asyncHandler(deleteNotification));

module.exports = router;
