const axios = require("axios");
const User = require("../models/User");
const Transaction = require("../models/Transaction");
const NumberRental = require("../models/NumberRental");
const telnyx = require("../services/telnyx");
const { getUsdToNgnRate } = require("../services/fx");

const STUCK_MS = 5 * 60 * 1000;
const MIN_AGE_MS = 60 * 1000; // never touch a rental that is still being processed
const RENTAL_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;
const FILTERS = ["pending", "provisioning", "active", "expired", "released", "failed"];

// Your Telnyx account balance (what number purchases are paid from).
async function telnyxBalance() {
  if (!telnyx.isConfigured()) return null;
  try {
    const r = await axios.get("https://api.telnyx.com/v2/balance", {
      headers: { Authorization: "Bearer " + process.env.TELNYX_API_KEY, Accept: "application/json" },
      timeout: 10000,
    });
    const d = (r.data && r.data.data) || {};
    return { balance: d.balance, currency: d.currency || "USD" };
  } catch (e) {
    return null;
  }
}

function tooFresh(rental) {
  return Date.now() - new Date(rental.updatedAt).getTime() < MIN_AGE_MS;
}

// Atomically claims a pending/provisioning rental, marks it failed, refunds once.
async function failAndRefund(id, reason) {
  const claimed = await NumberRental.findOneAndUpdate(
    { _id: id, status: { $in: ["pending", "provisioning"] } },
    { $set: { status: "failed", failReason: reason }, $unset: { lockKey: 1 } },
    { new: true }
  );
  if (!claimed) return null;
  await User.findByIdAndUpdate(claimed.user, { $inc: { balance: claimed.pricePaid } });
  return claimed;
}

// Atomically claims a pending/provisioning rental and makes it active.
async function activate(id) {
  const now = new Date();
  const claimed = await NumberRental.findOneAndUpdate(
    { _id: id, status: { $in: ["pending", "provisioning"] } },
    {
      $set: {
        status: "active",
        startedAt: now,
        expiresAt: new Date(now.getTime() + RENTAL_DAYS * DAY_MS),
        failReason: "",
      },
    },
    { new: true }
  );
  if (!claimed) return null;

  if (!claimed.telnyxNumberId) {
    try {
      const numberId = await telnyx.findNumberId(claimed.phoneNumber);
      if (numberId) {
        claimed.telnyxNumberId = numberId;
        await claimed.save();
      }
    } catch (e) {
      console.error("findNumberId failed:", e.message);
    }
  }

  try {
    const ref = "number:" + claimed._id;
    const exists = await Transaction.findOne({ paymentReference: ref });
    if (!exists) {
      await Transaction.create({
        user: claimed.user,
        type: "number_rental",
        amount: claimed.pricePaid,
        status: "successful",
        description: "Number rental: " + claimed.phoneNumber,
        paymentReference: ref,
        phone: claimed.phoneNumber,
        country: claimed.country,
      });
    }
  } catch (e) {
    console.error("number activate tx failed:", e.message);
  }
  return claimed;
}

// GET /api/numbers/admin/rentals?status=all|pending|provisioning|active|expired|released|failed
const getRentals = async (req, res) => {
  try {
    const status = String(req.query.status || "all");
    const cutoff = new Date(Date.now() - STUCK_MS);

    const q = {};
    if (FILTERS.includes(status)) q.status = status;

    const rows = await NumberRental.find(q)
      .populate("user", "name email")
      .sort({ createdAt: -1 })
      .limit(200);

    const rentals = rows.map((r) => {
      const o = r.toObject();
      delete o.lockKey;
      o.stuck = (r.status === "pending" || r.status === "provisioning") && r.updatedAt < cutoff;
      return o;
    });

    const agg = await NumberRental.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          revenue: { $sum: "$pricePaid" },
          costUsd: {
            $sum: { $add: [{ $ifNull: ["$upfrontCostUsd", 0] }, { $ifNull: ["$monthlyCostUsd", 0] }] },
          },
        },
      },
    ]);

    const byStatus = {};
    let revenue = 0;
    let costUsd = 0;
    agg.forEach((a) => {
      byStatus[a._id] = a.count;
      if (["active", "expired", "released"].includes(a._id)) {
        revenue += a.revenue || 0;
        costUsd += a.costUsd || 0;
      }
    });

    const fx = await getUsdToNgnRate();
    const estimatedCostNgn = Math.round(costUsd * fx);

    const stuck = await NumberRental.countDocuments({
      status: { $in: ["pending", "provisioning"] },
      updatedAt: { $lt: cutoff },
    });

    const now = new Date();
    const expiringSoon = await NumberRental.countDocuments({
      status: "active",
      expiresAt: { $gte: now, $lte: new Date(now.getTime() + 3 * DAY_MS) },
    });

    res.status(200).json({
      rentals,
      summary: {
        byStatus,
        revenue,
        costUsd,
        estimatedCostNgn,
        estimatedProfit: revenue - estimatedCostNgn,
        stuck,
        expiringSoon,
      },
      telnyx: await telnyxBalance(),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/numbers/admin/rentals/:id/sync  - asks Telnyx what really happened
const syncRental = async (req, res) => {
  try {
    const rental = await NumberRental.findById(req.params.id);
    if (!rental) return res.status(404).json({ message: "Rental not found" });
    if (!["pending", "provisioning"].includes(rental.status)) {
      return res.status(400).json({ message: "This rental is not waiting on Telnyx" });
    }
    if (tooFresh(rental)) {
      return res.status(400).json({ message: "This rental was just updated. Wait a minute and try again." });
    }

    let state = "unknown";

    if (rental.telnyxOrderId) {
      try {
        const o = await telnyx.getOrder(rental.telnyxOrderId);
        if (o.status === "success") state = "success";
        else if (o.status === "failure" || o.status === "expired") state = "failed";
        else state = "pending";
      } catch (e) {
        console.error("sync getOrder failed:", e.message);
      }
    }

    // No order id (or lookup failed): see if the number is in our Telnyx account.
    if (state === "unknown") {
      try {
        const numberId = await telnyx.findNumberId(rental.phoneNumber);
        if (numberId) state = "success";
      } catch (e) {
        console.error("sync findNumberId failed:", e.message);
      }
    }

    if (state === "success") {
      const done = await activate(rental._id);
      if (!done) return res.status(400).json({ message: "Already updated by someone else" });
      return res.status(200).json({ message: "Telnyx confirmed the number. Rental is now active.", state });
    }

    if (state === "failed") {
      const done = await failAndRefund(rental._id, "Telnyx order failed (checked by admin)");
      if (!done) return res.status(400).json({ message: "Already updated by someone else" });
      return res.status(200).json({ message: "Telnyx order failed. The user has been refunded.", state });
    }

    if (state === "pending") {
      return res.status(200).json({ message: "Telnyx has not finished this order yet. Check again later.", state });
    }

    return res.status(200).json({
      message:
        "Could not find this number or order on Telnyx. If it is not in your Telnyx account either, it is safe to refund.",
      state,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/numbers/admin/rentals/:id/refund
const adminRefund = async (req, res) => {
  try {
    const rental = await NumberRental.findById(req.params.id);
    if (!rental) return res.status(404).json({ message: "Rental not found" });
    if (tooFresh(rental)) {
      return res.status(400).json({ message: "This rental was just updated. Wait a minute and try again." });
    }
    const done = await failAndRefund(rental._id, "Refunded by admin");
    if (!done) {
      return res.status(400).json({ message: "Rental not found, not stuck, or already refunded" });
    }
    res.status(200).json({ message: "User refunded" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/numbers/admin/rentals/:id/release  - gives the number back to Telnyx
const releaseRental = async (req, res) => {
  try {
    const rental = await NumberRental.findOne({ _id: req.params.id, status: "active" });
    if (!rental) return res.status(400).json({ message: "Only active rentals can be released" });

    let numberId = rental.telnyxNumberId;
    if (!numberId) {
      try {
        numberId = await telnyx.findNumberId(rental.phoneNumber);
      } catch (e) {
        console.error("release findNumberId failed:", e.message);
      }
    }
    if (!numberId) {
      return res.status(400).json({
        message: "Could not find this number on Telnyx. Release it in the Telnyx dashboard, then try again.",
      });
    }

    try {
      await telnyx.releaseNumber(numberId);
    } catch (e) {
      return res.status(502).json({ message: "Telnyx refused: " + telnyx.errorMessage(e) });
    }

    rental.status = "released";
    rental.autoRenew = false;
    rental.lockKey = undefined;
    await rental.save();

    res.status(200).json({ message: "Number released back to Telnyx" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getRentals, syncRental, adminRefund, releaseRental };