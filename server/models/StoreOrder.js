const mongoose = require("mongoose");

const credentialSchema = new mongoose.Schema(
  {
    details: { type: String }, // encrypted
    link: { type: String },
  },
  { _id: false }
);

const storeOrderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    productId: { type: Number, required: true },
    productName: { type: String, required: true },
    categoryName: { type: String },
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true }, // NGN per item charged to user
    price: { type: Number, required: true }, // NGN total charged to user

    supplierOrderId: { type: String },
    supplierCost: { type: Number },
    idempotencyKey: { type: String, required: true, unique: true },

    credentials: [credentialSchema],

    status: {
      type: String,
      enum: ["pending", "completed", "review", "failed", "refunded"],
      default: "pending",
    },
    refunded: { type: Boolean, default: false },
    failReason: { type: String }, // internal only, never sent to users
  },
  { timestamps: true }
);

module.exports = mongoose.model("StoreOrder", storeOrderSchema);