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
      { $match: { status: "successful" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const totalTransactions = await Transaction.countDocuments();

    const recentUsers = await User.find()
      .select("-password")
      .sort({ createdAt: -1 })
      .limit(5);

    res.status(200).json({
      totalUsers,
      totalRevenue: totalRevenue[0]?.total || 0,
      totalTransactions,
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

// ── GET ALL SERVICE CONTROLS ──────────────────
const getServiceControls = async (req, res) => {
  try {
    const defaults = [
      { key: "whatsapp", type: "service", label: "WhatsApp" },
      { key: "telegram", type: "service", label: "Telegram" },
      { key: "google", type: "service", label: "Google" },
      { key: "facebook", type: "service", label: "Facebook" },
      { key: "tiktok", type: "service", label: "TikTok" },
      { key: "instagram", type: "service", label: "Instagram" },
      { key: "5sim", type: "provider", label: "5sim Provider" },
      { key: "grizzly", type: "provider", label: "Grizzly SMS Provider" },
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