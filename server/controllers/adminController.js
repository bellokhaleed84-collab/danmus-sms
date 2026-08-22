const User = require("../models/User");
const Transaction = require("../models/Transaction");
const ServiceControl = require("../models/ServiceControl");

// ── GET ALL USERS ─────────────────────────────
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select("-password")
      .sort({ createdAt: -1 });

    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── GET PLATFORM STATS ────────────────────────
const getPlatformStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();

    const totalRevenue = await Transaction.aggregate([
      { $match: { status: "successful", type: "deposit" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const totalTransactions = await Transaction.countDocuments();

    // Total money currently sitting in all user wallets (a liability, not profit)
    const walletAgg = await User.aggregate([
      { $group: { _id: null, total: { $sum: "$balance" } } },
    ]);
    const totalWalletBalance = walletAgg[0]?.total || 0;

    // Estimated profit from SMS sales. Prices are charged at cost * 1.8,
    // so the profit share of what's charged is (1.8 - 1) / 1.8 ≈ 44.4%.
    // This is an estimate since exact provider cost per sale isn't stored.
    const MARKUP = 1.8;
    const profitShare = (MARKUP - 1) / MARKUP;

    const smsRevenueAgg = await Transaction.aggregate([
      { $match: { status: "successful", type: "sms_purchase" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const smsRevenue = smsRevenueAgg[0]?.total || 0;
    const estimatedProfit = Math.round(smsRevenue * profitShare);

    // Most used provider, parsed from paymentReference like "fivesim:12345"
    const providerAgg = await Transaction.aggregate([
      { $match: { type: "sms_purchase", paymentReference: { $exists: true, $ne: null } } },
      {
        $project: {
          provider: { $arrayElemAt: [{ $split: ["$paymentReference", ":"] }, 0] },
        },
      },
      { $group: { _id: "$provider", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const PROVIDER_LABELS = {
      smspool: "SMSPool (Provider 1)",
      fivesim: "5sim (Provider 2)",
      "5sim": "5sim (Provider 2)",
      grizzly: "Grizzly (Provider 3)",
    };

    const mostUsedProvider = providerAgg.length > 0
      ? {
          key: providerAgg[0]._id,
          label: PROVIDER_LABELS[providerAgg[0]._id] || providerAgg[0]._id,
          count: providerAgg[0].count,
        }
      : null;

    const providerBreakdown = providerAgg.map((p) => ({
      key: p._id,
      label: PROVIDER_LABELS[p._id] || p._id,
      count: p.count,
    }));

    const recentUsers = await User.find()
      .select("-password")
      .sort({ createdAt: -1 })
      .limit(5);

    res.status(200).json({
      totalUsers,
      totalRevenue: totalRevenue[0]?.total || 0,
      totalTransactions,
      totalWalletBalance,
      estimatedProfit,
      mostUsedProvider,
      providerBreakdown,
      recentUsers,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── DELETE USER ───────────────────────────────
const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await User.findByIdAndDelete(userId);
    await Transaction.deleteMany({ user: userId });

    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── BAN USER ──────────────────────────────────
const banUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.role = user.role === "banned" ? "user" : "banned";
    await user.save();

    res.status(200).json({
      message: user.role === "banned"
        ? "User banned successfully"
        : "User unbanned successfully",
      role: user.role,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── GET ALL TRANSACTIONS ──────────────────────
const getAllTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find()
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json(transactions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── ADJUST USER BALANCE ───────────────────────
const adjustUserBalance = async (req, res) => {
  try {
    const { userId } = req.params;
    const { amount, type, description } = req.body;

    if (!amount || isNaN(amount)) {
      return res.status(400).json({ message: "Valid amount is required" });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const numAmount = Number(amount);

    if (type === "deduct" && user.balance < numAmount) {
      return res.status(400).json({ message: "User has insufficient balance" });
    }

    if (type === "deduct") {
      user.balance -= numAmount;
    } else {
      user.balance += numAmount;
    }

    await user.save();

    await Transaction.create({
      user: user._id,
      type: "deposit",
      amount: numAmount,
      status: "successful",
      description: description || `Admin ${type === "deduct" ? "deduction" : "top-up"}`,
    });

    res.status(200).json({
      message: `Balance ${type === "deduct" ? "deducted" : "added"} successfully`,
      balance: user.balance,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── SERVICE CONTROL DEFAULTS ──────────────────
const PROVIDERS = [
  { key: "smspool", label: "Provider 1 (SMSPool)" },
  { key: "fivesim", label: "Provider 2 (5sim)" },
  { key: "grizzly", label: "Provider 3 (Grizzly)" },
];

const SERVICES = [
  { key: "whatsapp", label: "WhatsApp" },
  { key: "telegram", label: "Telegram" },
  { key: "google", label: "Google" },
  { key: "facebook", label: "Facebook" },
  { key: "tiktok", label: "TikTok" },
  { key: "instagram", label: "Instagram" },
];

// ── GET ALL SERVICE CONTROLS ──────────────────
const getServiceControls = async (req, res) => {
  try {
    const defaults = [
      ...SERVICES.map((s) => ({ key: s.key, type: "service", label: s.label })),
      ...PROVIDERS.map((p) => ({ key: p.key, type: "provider", label: p.label })),
      ...PROVIDERS.flatMap((p) =>
        SERVICES.map((s) => ({
          key: `${p.key}:${s.key}`,
          type: "provider_service",
          label: `${p.label} — ${s.label}`,
        }))
      ),
    ];

    for (const item of defaults) {
      await ServiceControl.findOneAndUpdate(
        { key: item.key },
        { $setOnInsert: item },
        { upsert: true, new: true }
      );
    }

    const controls = await ServiceControl.find().sort({ type: 1, label: 1 });
    res.status(200).json(controls);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── TOGGLE SERVICE CONTROL ────────────────────
const toggleServiceControl = async (req, res) => {
  try {
    const { key } = req.params;
    const { locked, reason } = req.body;

    const control = await ServiceControl.findOneAndUpdate(
      { key },
      { locked, reason: reason || "" },
      { new: true }
    );

    if (!control) {
      return res.status(404).json({ message: "Service not found" });
    }

    res.status(200).json({
      message: `${control.label} ${locked ? "locked" : "unlocked"} successfully`,
      control,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── GET LOCKED SERVICES (public) ─────────────
const getLockedServices = async (req, res) => {
  try {
    const locked = await ServiceControl.find({ locked: true });
    res.status(200).json(locked);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAllUsers,
  getPlatformStats,
  deleteUser,
  banUser,
  getAllTransactions,
  adjustUserBalance,
  getServiceControls,
  toggleServiceControl,
  getLockedServices,
};