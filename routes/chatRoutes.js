const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");
const { sendMessage, getChat } = require("../controllers/chatController");

router.post("/", auth, sendMessage);
router.post("/send", auth, sendMessage);
router.get("/:userId", auth, getChat);

module.exports = router;
