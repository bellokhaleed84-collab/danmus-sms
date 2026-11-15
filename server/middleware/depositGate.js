const PaymentSettings = require("../models/PaymentSettings");

// Put this on the route that STARTS a deposit. Do NOT put it on webhook routes,
// so payments already made can still be credited during maintenance.
const requireDepositsOpen = async (req, res, next) => {
  try {
    const s = await PaymentSettings.getSettings();
    if (!s.depositsEnabled) {
      return res.status(503).json({
        code: "DEPOSITS_PAUSED",
        message: s.maintenanceMessage,
      });
    }
    req.paymentSettings = s; // gives the payment code the active provider
    next();
  } catch (error) {
    res.status(500).json({ message: "Could not check payment status" });
  }
};

module.exports = { requireDepositsOpen };