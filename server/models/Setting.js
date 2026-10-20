const mongoose = require("mongoose");

// One document per feature: "boost" or "store".
const settingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    enabled: { type: Boolean, default: false },
    markupPercent: { type: Number, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Setting", settingSchema);