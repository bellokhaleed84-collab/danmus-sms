const express = require("express");
const { initialize } = require("../controllers/depositController");
const { protect } = require("../middleware/authMiddleware");
const { requireDepositsOpen } = require("../middleware/depositGate");

const router = express.Router();

router.post("/initialize", protect, requireDepositsOpen, initialize);

module.exports = router;