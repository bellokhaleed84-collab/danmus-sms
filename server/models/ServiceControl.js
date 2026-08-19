const mongoose = require("mongoose");

const serviceControlSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
    },
    type: {
      type: String,
      enum: ["service", "provider"],
      required: true,
    },
    label: {
      type: String,
      required: true,
    },
    locked: {
      type: Boolean,
      default: false,
    },
    reason: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ServiceControl", serviceControlSchema);