const express = require("express");
const {
  getProviderCountries,
  getProviderProducts,
  buySMS,
  checkSMS,
  cancelOrder,
  getSmsHistory,
} = require("../controllers/smsController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// Guest routes — no login needed
router.get("/:provider/countries", getProviderCountries);
router.get("/:provider/products/:country", getProviderProducts);

// Protected routes — login required
router.post("/buy", protect, buySMS);
router.get("/check/:orderId", protect, checkSMS);
router.get("/cancel/:orderId", protect, cancelOrder);
router.get("/history", protect, getSmsHistory);

module.exports = router;