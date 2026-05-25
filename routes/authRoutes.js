const express = require("express");
const { register, login, getMe } = require("../controllers/authController");
const auth = require("../middleware/authMiddleware");
const asyncHandler = require("../middleware/asyncHandler");

const router = express.Router();

router.post("/register", asyncHandler(register));
router.post("/login", asyncHandler(login));
router.get("/me", auth, asyncHandler(getMe));

module.exports = router;
