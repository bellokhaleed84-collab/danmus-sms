const mongoose = require("mongoose");

const numberRentalSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },

    phoneNumber: { type: String, required: true }, // E.164, e.g. +14155550123

    // Set while the number is pending/provisioning/active, removed when it
    // is failed/expired/released. Unique+sparse means the same number can
    // never be rented twice at the same time.
    lockKey: { type: String, unique: true, sparse: true },

    country: { type: String },
    numberType: { type: String },
    region: { type: String },
    features: [{ type: String }],

    upfrontCostUsd: { type: Number },
    monthlyCostUsd: { type: Number },
    pricePaid: { type: Number, required: true }, // NGN charged to the user

    status: {
      type: String,
      enum: ["pending", "provisioning", "active", "expired", "released", "failed"],
      default: "pending",
    },

    telnyxOrderId: { type: String },
    telnyxNumberId: { type: String },

    startedAt: { type: Date },
    expiresAt: { type: Date },
    autoRenew: { type: Boolean, default: true },

    failReason: { type: String }, // internal only
  },
  { timestamps: true }
);

module.exports = mongoose.model("NumberRental", numberRentalSchema);