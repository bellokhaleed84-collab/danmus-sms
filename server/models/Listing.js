const mongoose = require("mongoose");

const listingSchema = new mongoose.Schema(
  {
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    platform: {
      type: String,
      enum: ["instagram", "facebook", "tiktok", "twitter", "telegram", "whatsapp", "other"],
      required: true,
    },
    title: { type: String, required: true },
    description: { type: String, required: true },
    followers: { type: Number, default: 0 },
    accountAge: { type: String }, // e.g. "2 years"
    price: { type: Number, required: true },

    // Revealed only to buyer after purchase
    credentials: {
      username: { type: String, required: true },
      password: { type: String, required: true },
      email: { type: String },
      recoveryInfo: { type: String },
    },

    screenshots: [{ type: String }], // image URLs (proof of stats)

    status: {
      type: String,
      enum: ["pending_review", "active", "sold", "rejected", "removed"],
      default: "pending_review",
    },

    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    soldAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Listing", listingSchema);