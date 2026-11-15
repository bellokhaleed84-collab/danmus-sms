const express = require("express");
const {
  getStatus,
  getAdminSettings,
  updateSettings,
} = require("../controllers/paymentSettingsController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// Same admin check as adminRoutes.js (ADMIN_EMAILS env var)
const adminOnly = (req, res, next) => {
  const adminEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (!req.user || !adminEmails.includes(String(req.user.email).toLowerCase())) {
    return res.status(403).json({ message: "Admin access denied" });
  }
  next();
};

router.get("/status", protect, getStatus);
router.get("/admin", protect, adminOnly, getAdminSettings);
router.put("/admin", protect, adminOnly, updateSettings);

module.exports = router;