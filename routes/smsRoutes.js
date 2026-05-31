const express = require("express");

const { buySMS } = require("../controllers/smsController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// Buy SMS Route
router.post("/buy", protect, buySMS);

module.exports = router;