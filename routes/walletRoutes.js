const express = require("express");

const {
  fundWallet,
  getTransactions,
} = require("../controllers/walletController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// Fund Wallet
router.post("/fund", protect, fundWallet);

// Get Transactions
router.get("/transactions", protect, getTransactions);

module.exports = router;