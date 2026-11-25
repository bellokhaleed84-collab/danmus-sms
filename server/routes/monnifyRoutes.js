const express = require("express");
const { verify } = require("../controllers/monnifyController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// Starting a payment goes through /api/deposit/initialize.
// The webhook is mounted separately in app.js (needs the raw body).
router.get("/verify/:reference", protect, verify);

module.exports = router;