const express = require("express");
const { register, login, getMe, resetPassword } = require("../controllers/authController");
const auth = require("../middleware/authMiddleware");
const asyncHandler = require("../middleware/asyncHandler");

const router = express.Router();

router.post("/register", asyncHandler(register));
router.post("/login", asyncHandler(login));
router.post("/reset-password", asyncHandler(resetPassword));
router.get("/me", auth, asyncHandler(getMe));

module.exports = router;
