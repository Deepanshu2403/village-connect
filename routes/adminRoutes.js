const express = require("express");
const auth = require("../middleware/authMiddleware");
const admin = require("../middleware/adminMiddleware");
const {
  getAllUsers,
  suspendUser,
  getAllTrips,
  getStats,
} = require("../controllers/adminController");

const router = express.Router();

router.use(auth, admin);
router.get("/users", getAllUsers);
router.put("/users/:id/suspend", suspendUser);
router.get("/trips", getAllTrips);
router.get("/stats", getStats);

module.exports = router;
