const mongoose = require("mongoose");

const boostOrderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    serviceId: { type: String, required: true }, // Owlet's service ID
    serviceName: { type: String },
    category: { type: String },
    link: { type: String, required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true }, // NGN charged to the user (with markup)
    providerOrderId: { type: String }, // Owlet's own order ID, used to check status

    status: {
      type: String,
      enum: [
        "pending",
        "in_progress",
        "completed",
        "partial",
        "canceled",
        "failed",
        "refunded",
      ],
      default: "pending",
    },

    startCount: { type: Number },
    remains: { type: Number },
  },
  { timestamps: true }
);

module.exports = mongoose.model("BoostOrder", boostOrderSchema);