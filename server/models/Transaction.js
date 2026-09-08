const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    type: {
      type: String,
      enum: ["deposit", "sms_purchase", "marketplace_purchase"],
      required: true,
    },

    amount: {
      type: Number,
      required: true,
    },

    status: {
      type: String,
      enum: ["pending", "successful", "failed", "not_successful"],
      default: "successful",
    },

    description: {
      type: String,
    },

    paymentReference: {
      type: String,
    },

    refunded: {
      type: Boolean,
      default: false,
    },

    phone: {
      type: String,
    },

    country: {
      type: String,
    },

    service: {
      type: String,
    },

    otp: {
      type: String,
    },

    platform: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Transaction", transactionSchema);