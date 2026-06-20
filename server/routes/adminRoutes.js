const express = require("express");
const router = express.Router();
const {
  getAllUsers,
  getPlatformStats,
  deleteUser,
  banUser,
  getAllTransactions,
  adjustUserBalance,
} = require("../controllers/adminController");
const { protect } = require("../middleware/authMiddleware");

const adminOnly = (req, res, next) => {
  const adminEmails = process.env.ADMIN_EMAILS?.split(",") || [];
  if (!adminEmails.includes(req.user.email)) {
    return res.status(403).json({ message: "Admin access denied" });
  }
  next();
};

router.get("/users", protect, adminOnly, getAllUsers);
router.get("/stats", protect, adminOnly, getPlatformStats);
router.delete("/users/:userId", protect, adminOnly, deleteUser);
router.patch("/users/:userId/ban", protect, adminOnly, banUser);
router.get("/transactions", protect, adminOnly, getAllTransactions);
router.patch("/users/:userId/balance", protect, adminOnly, adjustUserBalance);

module.exports = router;