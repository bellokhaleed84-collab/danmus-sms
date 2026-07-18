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
      enum: ["pending", "successful", "failed"],
      default: "successful",
    },

    description: {
      type: String,
    },

    paymentReference: {
      type: String,
    },

    // ── STRUCTURED DETAILS (optional — populated going forward) ──
    phone: {
      type: String, // SMS purchases: the virtual number issued
    },

    country: {
      type: String, // SMS purchases: country of the number
    },

    service: {
      type: String, // SMS purchases: e.g. "whatsapp", "telegram"
    },

    platform: {
      type: String, // Marketplace purchases: e.g. "instagram", "tiktok"
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Transaction", transactionSchema);