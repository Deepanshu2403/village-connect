const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");
const { sendMessage, getChat } = require("../controllers/chatController");
const asyncHandler = require("../middleware/asyncHandler");

router.post("/", auth, asyncHandler(sendMessage));
router.post("/send", auth, asyncHandler(sendMessage));
router.get("/:userId", auth, asyncHandler(getChat));

module.exports = router;
