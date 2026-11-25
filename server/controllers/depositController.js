const squadController = require("./squadController");
const monnifyController = require("./monnifyController");

// Starts a wallet deposit with whichever provider the admin has switched on
// (Payment Settings page). The depositGate middleware has already checked
// that deposits are not paused and put the settings on req.paymentSettings.
const initialize = (req, res) => {
  const provider = req.paymentSettings && req.paymentSettings.activeProvider;

  if (provider === "monnify") return monnifyController.initialize(req, res);

  // Squad is the default (and the fallback for any old/unknown value).
  return squadController.initialize(req, res);
};

module.exports = { initialize };