const User = require("../models/User");
const Transaction = require("../models/Transaction");

// Fund Wallet
const fundWallet = async (req, res) => {
  try {
    const { amount } = req.body;

    // Validate amount
    if (!amount || isNaN(amount)) {
      return res.status(400).json({
        message: "Please enter a valid amount",
      });
    }

    // Find logged in user
    const user = await User.findById(req.user._id);

    // Convert amount to number
    const fundAmount = Number(amount);

    // Update balance
    user.balance += fundAmount;

    await user.save();

    // Save transaction
    const transaction = await Transaction.create({
      user: user._id,
      type: "deposit",
      amount: fundAmount,
      status: "successful",
      description: "Wallet funding",
    });

    res.status(200).json({
      message: "Wallet funded successfully",
      balance: user.balance,
      transaction,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// Get Transactions
const getTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find({
      user: req.user._id,
    }).sort({ createdAt: -1 });

    res.status(200).json(transactions);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

module.exports = {
  fundWallet,
  getTransactions,
};