const mongoose = require("mongoose");

const numberMessageSchema = new mongoose.Schema(
  {
    rental: { type: mongoose.Schema.Types.ObjectId, ref: "NumberRental", required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    from: { type: String },
    to: { type: String },
    text: { type: String },
    code: { type: String }, // first 4-8 digit code found in the text, if any
    telnyxMessageId: { type: String, unique: true, sparse: true }, // prevents duplicates on webhook retries
    receivedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("NumberMessage", numberMessageSchema);