const mongoose = require("mongoose");
const BoostOrder = require("../models/BoostOrder");
const StoreOrder = require("../models/StoreOrder");

const STUCK_MS = 5 * 60 * 1000;

// GET /api/admin/system/db-stats
const getDbStats = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const s = await db.command({ dbStats: 1 });

    const limitMb = Number(process.env.MONGO_STORAGE_LIMIT_MB) || 512;
    const limitBytes = limitMb * 1024 * 1024;
    const usedBytes = (s.storageSize || 0) + (s.indexSize || 0);

    const cols = await db.listCollections().toArray();
    const collections = (
      await Promise.all(
        cols.map(async (c) => {
          try {
            const cs = await db.command({ collStats: c.name });
            return {
              name: c.name,
              count: cs.count || 0,
              dataSize: cs.size || 0,
              storageSize: cs.storageSize || 0,
              indexSize: cs.totalIndexSize || 0,
            };
          } catch (e) {
            return null;
          }
        })
      )
    )
      .filter(Boolean)
      .sort((a, b) => b.storageSize + b.indexSize - (a.storageSize + a.indexSize));

    res.status(200).json({
      db: s.db,
      dataSize: s.dataSize || 0,
      storageSize: s.storageSize || 0,
      indexSize: s.indexSize || 0,
      usedBytes,
      limitBytes,
      limitMb,
      remainingBytes: Math.max(limitBytes - usedBytes, 0),
      percentUsed: limitBytes ? Math.min((usedBytes / limitBytes) * 100, 100) : 0,
      collections,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/admin/boost/orders
const getBoostOrders = async (req, res) => {
  try {
    const orders = await BoostOrder.find()
      .populate("user", "name email")
      .sort({ createdAt: -1 })
      .limit(200);

    const byStatus = {};
    let revenue = 0;
    const agg = await BoostOrder.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 }, total: { $sum: "$price" } } },
    ]);
    agg.forEach((a) => {
      byStatus[a._id] = a.count;
      if (!["failed", "canceled", "refunded"].includes(a._id)) revenue += a.total || 0;
    });

    res.status(200).json({ orders, summary: { byStatus, revenue } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/admin/store/orders?status=all|review|stuck|pending|completed|failed|refunded
const getStoreOrders = async (req, res) => {
  try {
    const status = String(req.query.status || "all");
    const cutoff = new Date(Date.now() - STUCK_MS);

    const q = {};
    if (status === "stuck") {
      q.status = "pending";
      q.createdAt = { $lt: cutoff };
    } else if (["review", "pending", "completed", "failed", "refunded"].includes(status)) {
      q.status = status;
    }

    const rows = await StoreOrder.find(q)
      .select("-credentials")
      .populate("user", "name email")
      .sort({ createdAt: -1 })
      .limit(200);

    const orders = rows.map((o) => {
      const obj = o.toObject();
      obj.stuck = o.status === "pending" && o.createdAt < cutoff;
      return obj;
    });

    const byStatus = {};
    let revenue = 0;
    let cost = 0;
    const agg = await StoreOrder.aggregate([
      {
        $group: {
          _id: { status: "$status", refunded: "$refunded" },
          count: { $sum: 1 },
          total: { $sum: "$price" },
          cost: { $sum: { $ifNull: ["$supplierCost", 0] } },
        },
      },
    ]);
    agg.forEach((a) => {
      byStatus[a._id.status] = (byStatus[a._id.status] || 0) + a.count;
      if (a._id.status === "completed" && !a._id.refunded) {
        revenue += a.total || 0;
        cost += a.cost || 0;
      }
    });

    const stuckPending = await StoreOrder.countDocuments({ status: "pending", createdAt: { $lt: cutoff } });

    res.status(200).json({ orders, summary: { byStatus, revenue, cost, stuckPending } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getDbStats, getBoostOrders, getStoreOrders };