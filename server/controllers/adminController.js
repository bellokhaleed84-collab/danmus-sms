const User = require("../models/User");
const Transaction = require("../models/Transaction");

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

    // Add or deduct
    if (type === "deduct") {
      user.balance -= numAmount;
    } else {
      user.balance += numAmount;
    }

    await user.save();

    // Save transaction
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

module.exports = {
  getAllUsers,
  getPlatformStats,
  deleteUser,
  banUser,
  getAllTransactions,
  adjustUserBalance,
};