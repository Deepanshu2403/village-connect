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

const router = express.Router();

router.get("/", auth, getNotifications);
router.put("/read", auth, markOneRead);
router.put("/read-all", auth, markAllRead);
router.delete("/clear-all", auth, clearAllNotifications);
router.delete("/clear-read", auth, clearReadNotifications);
router.delete("/:id", auth, deleteNotification);

module.exports = router;
