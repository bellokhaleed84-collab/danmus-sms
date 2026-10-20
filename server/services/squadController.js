const crypto = require("crypto");
const User = require("../models/User");
const Transaction = require("../models/Transaction");
const squad = require("../services/squad");

const MIN_NGN = 100;
const MAX_NGN = 500000;

// Verify with Squad, then credit the wallet exactly once.
// Safe to call from both the webhook and the browser callback.
async function settleDeposit(reference) {
  const tx = await Transaction.findOne({ paymentReference: reference, type: "deposit" });
  if (!tx) return { state: "not_found" };
  if (tx.status === "successful") return { state: "success", already: true, tx };
  if (tx.status === "failed") return { state: "failed", tx };

  const result = await squad.verifyTransaction(reference);

  if (result.status === "success") {
    if (result.amountKobo !== Math.round(tx.amount * 100)) {
      console.error("SQUAD AMOUNT MISMATCH", reference, result.amountKobo, tx.amount);
      return { state: "mismatch", tx };
    }
    // Atomic claim: only one caller can flip pending -> successful.
    const claimed = await Transaction.findOneAndUpdate(
      { _id: tx._id, status: "pending" },
      { status: "successful" },
      { new: true }
    );
    if (!claimed) return { state: "success", already: true, tx };

    try {
      await User.findByIdAndUpdate(tx.user, { $inc: { balance: tx.amount } });
    } catch (err) {
      // Credit failed: put it back to pending so a retry can credit it.
      await Transaction.updateOne({ _id: tx._id }, { status: "pending" });
      throw err;
    }
    return { state: "success", tx: claimed };
  }

  if (["failed", "abandoned", "expired", "cancelled"].includes(result.status)) {
    await Transaction.updateOne({ _id: tx._id, status: "pending" }, { status: "failed" });
    return { state: "failed", tx };
  }

  return { state: "pending", tx };
}

// POST /api/squad/initialize  { amount }  (amount in NGN)
const initialize = async (req, res) => {
  try {
    const amount = Number(req.body.amount);
    if (!Number.isFinite(amount) || amount < MIN_NGN || amount > MAX_NGN) {
      return res.status(400).json({
        message: `Amount must be between ₦${MIN_NGN} and ₦${MAX_NGN.toLocaleString()}`,
      });
    }
    const naira = Math.round(amount); // whole naira only
    const reference = `DSQ-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;

    await Transaction.create({
      user: req.user._id,
      type: "deposit",
      amount: naira,
      status: "pending",
      description: "Wallet funding (Squad)",
      paymentReference: reference,
    });

    try {
      const checkoutUrl = await squad.initializeTransaction({
        amountKobo: naira * 100,
        email: req.user.email,
        reference,
        callbackUrl: `${process.env.CLIENT_URL || "http://localhost:3000"}/wallet/verify`,
      });
      return res.json({ checkoutUrl, reference });
    } catch (err) {
      await Transaction.updateOne({ paymentReference: reference }, { status: "failed" });
      console.error("SQUAD INIT ERROR:", err.response?.data || err.message);
      return res.status(502).json({ message: "Could not start payment. Please try again." });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/squad/verify/:reference  (only the owner may check)
const verify = async (req, res) => {
  try {
    const owned = await Transaction.findOne({
      paymentReference: req.params.reference,
      user: req.user._id,
      type: "deposit",
    });
    if (!owned) return res.status(404).json({ message: "Transaction not found" });

    const r = await settleDeposit(req.params.reference);
    const user = await User.findById(req.user._id).select("balance");
    res.json({ state: r.state, balance: user.balance });
  } catch (error) {
    console.error("SQUAD VERIFY ERROR:", error.response?.data || error.message);
    res.status(502).json({ message: "Could not verify payment yet. Try again shortly." });
  }
};

// POST /api/squad/webhook  (raw body; mounted before express.json in app.js)
const webhook = async (req, res) => {
  const raw = req.body; // Buffer
  if (!squad.isValidWebhookSignature(raw, req.headers["x-squad-encrypted-body"])) {
    return res.status(401).send("Invalid signature");
  }
  try {
    const payload = JSON.parse(raw.toString("utf8"));
    const reference = payload.TransactionRef || payload.Body?.transaction_ref;
    if (reference && String(reference).startsWith("DSQ-")) {
      await settleDeposit(reference); // re-verifies with Squad; never trusts payload amount
    }
    return res.status(200).send("OK");
  } catch (err) {
    console.error("SQUAD WEBHOOK ERROR:", err.message);
    return res.status(500).send("Error"); // non-200 so Squad retries
  }
};

module.exports = { initialize, verify, webhook };
