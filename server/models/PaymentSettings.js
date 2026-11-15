const mongoose = require("mongoose");

const paymentSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: "global", unique: true },
    activeProvider: {
      type: String,
      enum: ["paystack", "squad"],
      default: "paystack",
    },
    depositsEnabled: { type: Boolean, default: true },
    maintenanceMessage: {
      type: String,
      default:
        "Sorry, wallet funding is temporarily unavailable while we are under maintenance. Please check back soon.",
    },
    updatedBy: { type: String },
  },
  { timestamps: true }
);

// Always returns the single settings record, creating it with defaults if missing.
paymentSettingsSchema.statics.getSettings = function () {
  return this.findOneAndUpdate(
    { key: "global" },
    { $setOnInsert: { key: "global" } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

module.exports = mongoose.model("PaymentSettings", paymentSettingsSchema);