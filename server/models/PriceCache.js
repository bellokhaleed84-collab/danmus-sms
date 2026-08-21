const mongoose = require("mongoose");

const priceCacheSchema = new mongoose.Schema(
  {
    provider: {
      type: String,
      required: true,
      enum: ["smspool", "fivesim", "grizzly"],
    },
    country: {
      type: String,
      required: true,
    },
    service: {
      type: String,
      required: true,
    },
    priceNgn: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);

// One cached price per provider+country+service combo — upserts in the
// controller rely on this being unique so they update in place rather than
// creating duplicate rows.
priceCacheSchema.index({ provider: 1, country: 1, service: 1 }, { unique: true });

module.exports = mongoose.model("PriceCache", priceCacheSchema);