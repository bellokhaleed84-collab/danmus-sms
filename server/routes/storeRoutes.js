const express = require("express");
const {
  getCatalog,
  createOrder,
  getMyOrders,
  getOrder,
  getSupplierBalance,
  getReviewOrders,
  adminRefund,
} = require("../controllers/storeController");
const { protect, isAdmin } = require("../middleware/authMiddleware");
const { storeAccess, isStoreOpenFor } = require("../middleware/storeAccess");

const router = express.Router();

// Tells the frontend whether to show the store or "coming soon".
router.get("/access", protect, (req, res) => {
  res.status(200).json({ open: !!isStoreOpenFor(req.user) });
});

// Everything below requires login AND store access.
router.use(protect, storeAccess);

router.get("/catalog", getCatalog);
router.post("/order", createOrder);
router.get("/orders/mine", getMyOrders); // must come before /orders/:id
router.get("/orders/:id", getOrder);

// Admin tools
router.get("/admin/balance", isAdmin, getSupplierBalance);
router.get("/admin/review", isAdmin, getReviewOrders);
router.post("/admin/orders/:id/refund", isAdmin, adminRefund);

module.exports = router;