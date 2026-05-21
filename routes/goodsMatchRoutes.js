const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");
const { createGoodsMatch } = require("../controllers/goodsMatchController");

router.post("/", auth, createGoodsMatch);

module.exports = router;