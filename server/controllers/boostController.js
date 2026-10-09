const axios = require("axios");
const User = require("../models/User");
const BoostOrder = require("../models/BoostOrder");

const OWLET_API_URL = process.env.OWLET_API_URL;
const OWLET_API_KEY = process.env.OWLET_API_KEY;

// Markup applied on top of Owlet's own NGN rate. Adjust freely.
const BOOST_MARKUP = 1.3;

function owletForm(params) {
  return new URLSearchParams({ key: OWLET_API_KEY, ...params }).toString();
}

async function owletRequest(params) {
  const response = await axios.post(OWLET_API_URL, owletForm(params), {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    timeout: 10000,
  });
  const data = response.data;
  if (data && data.error) {
    throw new Error(data.error);
  }
  return data;
}

// ── SERVICE CATALOG CACHE ─────────────────────
let servicesCache = null;
let servicesCacheAt = 0;
const SERVICES_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

async function getOwletServices() {
  const now = Date.now();
  if (servicesCache && now - servicesCacheAt < SERVICES_CACHE_TTL) {
    return servicesCache;
  }
  const data = await owletRequest({ action: "services" });
  const services = Array.isArray(data) ? data : [];
  servicesCache = services;
  servicesCacheAt = now;
  return services;
}

function toOption(svc) {
  const rate = Number(svc.rate) || 0; // NGN per 1000, as returned by Owlet
  const markedUpRate = Math.ceil(rate * BOOST_MARKUP);
  return {
    id: String(svc.service),
    name: svc.name,
    category: svc.category,
    type: svc.type,
    min: Number(svc.min) || 1,
    max: Number(svc.max) || 0,
    ratePerThousand: markedUpRate, // NGN, what the user actually pays per 1000
  };
}

function priceForQuantity(ratePerThousand, quantity) {
  return Math.ceil((ratePerThousand / 1000) * quantity);
}

// ── GET SERVICES (public — browsing doesn't need login) ──
// GET /api/boost/services
const getServices = async (req, res) => {
  try {
    const raw = await getOwletServices();
    const options = raw.map(toOption);
    res.status(200).json(options);
  } catch (error) {
    console.error("getServices failed:", error.message);
    res.status(500).json({ message: "Boosting services are temporarily unavailable. Please try again." });
  }
};

// ── PLACE ORDER (atomic — same pattern as marketplace purchase) ──
// POST /api/boost/order
const createOrder = async (req, res) => {
  try {
    const { serviceId, link, quantity } = req.body;

    if (!serviceId || !link || !quantity) {
      return res.status(400).json({ message: "Service, link and quantity are required" });
    }
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      return res.status(400).json({ message: "Invalid quantity" });
    }

    const raw = await getOwletServices();
    const match = raw.find((s) => String(s.service) === String(serviceId));
    if (!match) {
      return res.status(400).json({ message: "Service not found" });
    }
    const svc = toOption(match);

    if (qty < svc.min || (svc.max && qty > svc.max)) {
      return res.status(400).json({
        message: `Quantity must be between ${svc.min} and ${svc.max || "∞"} for this service`,
      });
    }

    const price = priceForQuantity(svc.ratePerThousand, qty);

    // Atomically charge the buyer — only succeeds if they actually have enough balance.
    const buyer = await User.findOneAndUpdate(
      { _id: req.user._id, balance: { $gte: price } },
      { $inc: { balance: -price } },
      { new: true }
    );

    if (!buyer) {
      return res.status(400).json({ message: "Insufficient balance" });
    }

    // Create the local record in "pending" before calling Owlet, so if the
    // process crashes mid-call we still have a record to reconcile/refund.
    const order = await BoostOrder.create({
      user: buyer._id,
      serviceId: svc.id,
      serviceName: svc.name,
      category: svc.category,
      link,
      quantity: qty,
      price,
      status: "pending",
    });

    try {
      const owletResponse = await owletRequest({
        action: "add",
        service: svc.id,
        link,
        quantity: qty,
      });

      order.providerOrderId = String(owletResponse.order);
      order.status = "in_progress";
      await order.save();

      return res.status(200).json({
        message: "Boost order placed successfully",
        order,
        balance: buyer.balance,
      });
    } catch (owletError) {
      // Owlet rejected the order — refund the user and mark it failed.
      console.error("Owlet add order failed:", owletError.message);
      await User.findByIdAndUpdate(buyer._id, { $inc: { balance: price } });
      order.status = "failed";
      await order.save();
      return res.status(400).json({
        message: `Could not place order with provider: ${owletError.message}`,
      });
    }
  } catch (error) {
    console.error("createOrder failed:", error.message);
    res.status(500).json({ message: "Failed to place boost order. Please try again." });
  }
};

// ── MY ORDERS ──────────────────────────────────
// GET /api/boost/orders/mine
const getMyOrders = async (req, res) => {
  try {
    const orders = await BoostOrder.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── CHECK ORDER STATUS (live from Owlet, then syncs local record) ──
// GET /api/boost/orders/:id/status
const getOrderStatus = async (req, res) => {
  try {
    const order = await BoostOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (String(order.user) !== String(req.user._id)) {
      return res.status(403).json({ message: "This isn't your order" });
    }
    if (!order.providerOrderId) {
      return res.status(200).json(order); // never reached Owlet successfully
    }

    const data = await owletRequest({ action: "status", order: order.providerOrderId });

    const statusMap = {
      pending: "pending",
      "in progress": "in_progress",
      processing: "in_progress",
      completed: "completed",
      partial: "partial",
      canceled: "canceled",
      cancelled: "canceled",
    };
    const normalized = String(data.status || "").toLowerCase();
    order.status = statusMap[normalized] || order.status;
    order.startCount = data.start_count != null ? Number(data.start_count) : order.startCount;
    order.remains = data.remains != null ? Number(data.remains) : order.remains;
    await order.save();

    res.status(200).json(order);
  } catch (error) {
    console.error("getOrderStatus failed:", error.message);
    res.status(500).json({ message: "Failed to check order status. Please try again." });
  }
};

module.exports = {
  getServices,
  createOrder,
  getMyOrders,
  getOrderStatus,
};