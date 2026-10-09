const express = require("express");
const {
  getServices,
  createOrder,
  getMyOrders,
  getOrderStatus,
} = require("../controllers/boostController");
const { protect } = require("../middleware/authMiddleware");
const { boostAccess, isBoostOpenFor } = require("../middleware/boostAccess");

const router = express.Router();

// Tells the frontend whether to show the real page or "coming soon".
// Declared before the gate so non-admins can still call it.
router.get("/access", protect, (req, res) => {
  res.status(200).json({ open: !!isBoostOpenFor(req.user) });
});

// Everything below requires login AND boost access.
router.use(protect, boostAccess);

router.get("/services", getServices);
router.get("/orders/mine", getMyOrders); // must come before /orders/:id/status
router.post("/order", createOrder);
router.get("/orders/:id/status", getOrderStatus);

module.exports = router;