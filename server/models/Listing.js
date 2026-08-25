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
      enum: [
        "instagram",
        "facebook",
        "tiktok",
        "twitter",
        "telegram",
        "whatsapp",
        "piavpn",
        "snapchat",
        "mailcom",
        "outlook",
        "netflix",
        "appleid",
        "moviebox",
        "applemusic",
        "reddit",
        "discord",
        "linkedin",
        "textplus",
        "hotspotshield",
        "nordvpn",
        "surfshark",
        "expressvpn",
        "other",
      ],
      required: true,
    },
    title: { type: String, required: true },
    description: { type: String, required: true },
    followers: { type: Number, default: 0 },
    accountAge: { type: String },
    price: { type: Number, required: true },

    previewLink: { type: String },

    credentials: {
      username: { type: String, required: true },
      password: { type: String, required: true },
      email: { type: String },
      recoveryInfo: { type: String },
    },

    screenshots: [{ type: String }],

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