const express = require("express");
const { initialize, verify } = require("../controllers/squadController");
const { protect } = require("../middleware/authMiddleware");
const { requireDepositsOpen } = require("../middleware/depositGate");

const router = express.Router();

// Webhook is mounted separately in app.js (needs the raw body).
// Starting a payment respects the admin "pause deposits" switch.
router.post("/initialize", protect, requireDepositsOpen, initialize);
router.get("/verify/:reference", protect, verify);

module.exports = router;