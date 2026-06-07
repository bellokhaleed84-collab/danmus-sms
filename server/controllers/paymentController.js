const axios = require("axios");

const User = require("../models/User");
const Transaction = require("../models/Transaction");

// ==========================================
// INITIALIZE PAYMENT
// ==========================================
const initializePayment = async (req, res) => {

  try {

    console.log("=================================");
    console.log("INITIALIZE PAYMENT STARTED");
    console.log("BODY:");
    console.log(req.body);

    console.log("PAYSTACK SECRET KEY:");
    console.log(process.env.PAYSTACK_SECRET_KEY);

    const { email, amount } = req.body;

    // Validate inputs
    if (!email || !amount) {

      return res.status(400).json({
        message: "Email and amount are required",
      });
    }

    // Send request to Paystack
    const response = await axios.post(
  "https://api.paystack.co/transaction/initialize",
  {
    email,
    amount: amount * 100,

    callback_url:
      "https://danmus-sms-ynmz.vercel.app/payment-success"
  },
  {
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
  }
);

    console.log("PAYSTACK RESPONSE:");
    console.log(response.data);

    // Success response
    res.status(200).json(response.data);

  } catch (error) {

    console.log("=================================");
    console.log("PAYSTACK INITIALIZE ERROR:");

    if (error.response) {

      console.log(error.response.data);

    } else {

      console.log(error.message);
    }

    res.status(500).json({
      message:
        error.response?.data?.message ||
        error.message ||
        "Payment initialization failed",
    });
  }
};

// ==========================================
// VERIFY PAYMENT
// ==========================================
const verifyPayment = async (req, res) => {

  try {

    console.log("=================================");
    console.log("VERIFY PAYMENT STARTED");

    // Get payment reference
    const { reference } = req.params;

    console.log("REFERENCE:");
    console.log(reference);

    // Verify payment with Paystack
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    console.log("PAYSTACK VERIFY RESPONSE:");
    console.log(response.data);

    const paymentData = response.data.data;

    // Check payment status
    if (paymentData.status === "success") {

      // Find user
      const user = await User.findById(req.user._id);

      console.log("USER FOUND:");
      console.log(user);

      if (!user) {

        return res.status(404).json({
          message: "User not found",
        });
      }

      // Check duplicate transaction
      const existingTransaction =
        await Transaction.findOne({
          paymentReference: reference,
        });

      if (existingTransaction) {

        return res.status(400).json({
          message: "Payment already verified",
        });
      }

      // Convert kobo to naira
      const amountPaid = paymentData.amount / 100;

      console.log("AMOUNT PAID:");
      console.log(amountPaid);

      // Update balance
      user.balance += amountPaid;

      await user.save();

      console.log("UPDATED BALANCE:");
      console.log(user.balance);

      // Save transaction
      const transaction =
        await Transaction.create({
          user: user._id,
          type: "deposit",
          amount: amountPaid,
          status: "successful",
          description: "Paystack wallet funding",
          paymentReference: reference,
        });

      console.log("TRANSACTION SAVED:");
      console.log(transaction);

      return res.status(200).json({
        message: "Payment verified successfully",
        balance: user.balance,
        transaction,
      });
    }

    // Failed payment
    res.status(400).json({
      message: "Payment not successful",
    });

  } catch (error) {

    console.log("=================================");
    console.log("VERIFY PAYMENT ERROR:");

    if (error.response) {

      console.log(error.response.data);

    } else {

      console.log(error.message);
    }

    res.status(500).json({
      message:
        error.response?.data?.message ||
        error.message ||
        "Payment verification failed",
    });
  }
};

module.exports = {
  initializePayment,
  verifyPayment,
};