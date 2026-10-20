const express = require("express");
const { initialize, verify } = require("../controllers/squadController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// Webhook is mounted separately in app.js (needs the raw body).
router.post("/initialize", protect, initialize);
router.get("/verify/:reference", protect, verify);

module.exports = router;
