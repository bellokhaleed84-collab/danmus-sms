const User = require("../models/User");
const Transaction = require("../models/Transaction");

// Buy SMS
const buySMS = async (req, res) => {
  try {
    const { amount } = req.body;

    // Check if amount is valid
    if (!amount || isNaN(amount)) {
      return res.status(400).json({
        message: "Please enter a valid amount",
      });
    }

    // Find logged in user
    const user = await User.findById(req.user._id);

    // Convert amount to number
    const smsCost = Number(amount);

    // Check user balance
    if (user.balance < smsCost) {
      return res.status(400).json({
        message: "Insufficient balance",
      });
    }

    // Deduct balance
    user.balance -= smsCost;

    // Save updated user
    await user.save();

    // Save transaction
    const transaction = await Transaction.create({
      user: user._id,
      type: "sms_purchase",
      amount: smsCost,
      status: "successful",
      description: "SMS Purchase",
    });

    // Send response
    res.status(200).json({
      message: "SMS purchased successfully",
      balance: user.balance,
      transaction,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

module.exports = {
  buySMS,
};