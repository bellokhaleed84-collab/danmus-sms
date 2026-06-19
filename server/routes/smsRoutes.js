const express = require("express");
const {
  getCountries,
  getServices,
  getProducts,
  buySMS,
  checkSMS,
  cancelOrder,
} = require("../controllers/smsController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// Guest routes — no login needed
router.get("/countries", getCountries);
router.get("/services/:country", getServices);
router.get("/products/:country/:service", getProducts);

// Protected routes — login required
router.post("/buy", protect, buySMS);
router.get("/check/:orderId", protect, checkSMS);
router.get("/cancel/:orderId", protect, cancelOrder);

module.exports = router;