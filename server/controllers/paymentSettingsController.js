const PaymentSettings = require("../models/PaymentSettings");

// A provider can only be selected if its keys exist on the server.
const PROVIDERS = [
  { key: "squad", label: "Squad", envKeys: ["SQUAD_SECRET_KEY"] },
  {
    key: "monnify",
    label: "Monnify",
    envKeys: ["MONNIFY_API_KEY", "MONNIFY_SECRET_KEY", "MONNIFY_CONTRACT_CODE"],
  },
];

const isConfigured = (p) => p.envKeys.every((k) => !!process.env[k]);

// GET /api/payment-settings/status  (any logged-in user)
const getStatus = async (req, res) => {
  try {
    const s = await PaymentSettings.getSettings();
    res.status(200).json({
      depositsEnabled: s.depositsEnabled,
      activeProvider: s.activeProvider,
      message: s.depositsEnabled ? "" : s.maintenanceMessage,
    });
  } catch (error) {
    res.status(500).json({ message: "Could not load payment status" });
  }
};

// GET /api/payment-settings/admin  (admin only)
const getAdminSettings = async (req, res) => {
  try {
    const s = await PaymentSettings.getSettings();
    res.status(200).json({
      activeProvider: s.activeProvider,
      depositsEnabled: s.depositsEnabled,
      maintenanceMessage: s.maintenanceMessage,
      updatedBy: s.updatedBy || null,
      updatedAt: s.updatedAt,
      providers: PROVIDERS.map((p) => ({
        key: p.key,
        label: p.label,
        configured: isConfigured(p),
      })),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/payment-settings/admin  (admin only)
const updateSettings = async (req, res) => {
  try {
    const { activeProvider, depositsEnabled, maintenanceMessage } = req.body;
    const update = { updatedBy: req.user.email };

    if (activeProvider !== undefined) {
      const provider = PROVIDERS.find((p) => p.key === activeProvider);
      if (!provider) {
        return res.status(400).json({ message: "Unknown payment provider" });
      }
      if (!isConfigured(provider)) {
        return res.status(400).json({
          message: `${provider.label} is not configured on the server (missing: ${provider.envKeys.join(", ")})`,
        });
      }
      update.activeProvider = activeProvider;
    }

    if (depositsEnabled !== undefined) {
      if (typeof depositsEnabled !== "boolean") {
        return res.status(400).json({ message: "depositsEnabled must be true or false" });
      }
      update.depositsEnabled = depositsEnabled;
    }

    if (maintenanceMessage !== undefined) {
      const msg = String(maintenanceMessage).trim().slice(0, 300);
      if (!msg) {
        return res.status(400).json({ message: "Maintenance message cannot be empty" });
      }
      update.maintenanceMessage = msg;
    }

    await PaymentSettings.getSettings(); // make sure the record exists
    const s = await PaymentSettings.findOneAndUpdate(
      { key: "global" },
      { $set: update },
      { new: true }
    );

    res.status(200).json({
      message: "Payment settings updated",
      activeProvider: s.activeProvider,
      depositsEnabled: s.depositsEnabled,
      maintenanceMessage: s.maintenanceMessage,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getStatus, getAdminSettings, updateSettings };