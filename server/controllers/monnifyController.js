const crypto = require("crypto");
const User = require("../models/User");
const Transaction = require("../models/Transaction");
const monnify = require("../services/monnify");

const MIN_NGN = 100;
const MAX_NGN = 500000;

// Verify with Monnify, then credit the wallet exactly once.
// Safe to call from both the webhook and the browser redirect.
async function settleDeposit(reference) {
  const tx = await Transaction.findOne({ paymentReference: reference, type: "deposit" });
  if (!tx) return { state: "not_found" };
  if (tx.status === "successful") return { state: "success", already: true, tx };

  const result = await monnify.verifyTransaction(reference);

  if (result.status === "PAID") {
    if (result.amountKobo !== Math.round(tx.amount * 100)) {
      console.error("MONNIFY AMOUNT MISMATCH", reference, result.amountKobo, tx.amount);
      return { state: "mismatch", tx };
    }
    // Atomic claim: only one caller can flip pending/failed -> successful.
    // ("failed" is allowed so a late payment on a retried checkout still credits.)
    const claimed = await Transaction.findOneAndUpdate(
      { _id: tx._id, status: { $in: ["pending", "failed"] } },
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

  if (["FAILED", "EXPIRED", "CANCELLED", "REVERSED"].includes(result.status)) {
    await Transaction.updateOne({ _id: tx._id, status: "pending" }, { status: "failed" });
    return { state: "failed", tx };
  }

  if (["OVERPAID", "PARTIALLY_PAID"].includes(result.status)) {
    // Needs a human: the amount does not match what was ordered.
    console.error("MONNIFY NEEDS REVIEW", reference, result.status, result.amountKobo, tx.amount);
  }

  return { state: "pending", tx };
}

// Called through POST /api/deposit/initialize  { amount }  (amount in NGN)
const initialize = async (req, res) => {
  try {
    const amount = Number(req.body.amount);
    if (!Number.isFinite(amount) || amount < MIN_NGN || amount > MAX_NGN) {
      return res.status(400).json({
        message: `Amount must be between \u20A6${MIN_NGN} and \u20A6${MAX_NGN.toLocaleString()}`,
      });
    }
    const naira = Math.round(amount); // whole naira only
    const reference = `DMN-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;

    await Transaction.create({
      user: req.user._id,
      type: "deposit",
      amount: naira,
      status: "pending",
      description: "Wallet funding (Monnify)",
      paymentReference: reference,
    });

    try {
      const checkoutUrl = await monnify.initializeTransaction({
        amountNaira: naira,
        email: req.user.email,
        name: req.user.name,
        reference,
        description: "Danmus SMS wallet funding",
        redirectUrl: `${process.env.CLIENT_URL || "http://localhost:3000"}/wallet/verify`,
      });
      return res.json({ checkoutUrl, reference });
    } catch (err) {
      await Transaction.updateOne({ paymentReference: reference }, { status: "failed" });
      console.error("MONNIFY INIT ERROR:", err.response?.data || err.message);
      return res.status(502).json({ message: "Could not start payment. Please try again." });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/monnify/verify/:reference  (only the owner may check)
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
    console.error("MONNIFY VERIFY ERROR:", error.response?.data || error.message);
    res.status(502).json({ message: "Could not verify payment yet. Try again shortly." });
  }
};

// POST /api/monnify/webhook  (raw body; mounted before express.json in app.js)
const webhook = async (req, res) => {
  const raw = req.body; // Buffer
  if (!monnify.isValidWebhookSignature(raw, req.headers["monnify-signature"])) {
    return res.status(401).send("Invalid signature");
  }
  try {
    const payload = JSON.parse(raw.toString("utf8"));
    if (payload.eventType === "SUCCESSFUL_TRANSACTION") {
      const reference = payload.eventData && payload.eventData.paymentReference;
      if (reference && String(reference).startsWith("DMN-")) {
        await settleDeposit(String(reference)); // re-verifies with Monnify; never trusts the payload amount
      }
    }
    return res.status(200).send("OK");
  } catch (err) {
    console.error("MONNIFY WEBHOOK ERROR:", err.message);
    return res.status(500).send("Error"); // non-200 so Monnify retries
  }
};

module.exports = { initialize, verify, webhook };