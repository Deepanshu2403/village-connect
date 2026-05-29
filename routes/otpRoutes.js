const express = require("express");
const { sendOTP, verifyOTP } = require("../controllers/otpController");
const asyncHandler = require("../middleware/asyncHandler");

const router = express.Router();

router.post("/send", asyncHandler(sendOTP));
router.post("/verify", asyncHandler(verifyOTP));

module.exports = router;
