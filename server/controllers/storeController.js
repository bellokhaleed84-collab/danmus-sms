const crypto = require("crypto");
const User = require("../models/User");
const Transaction = require("../models/Transaction");
const StoreOrder = require("../models/StoreOrder");
const rocky = require("../services/rocky");
const { encrypt, decrypt } = require("../utils/encryption");

// Markup on top of the supplier price. Adjust freely.
const STORE_MARKUP = 1.3;
const MAX_QTY = 50;
const CATALOG_TTL = 5 * 60 * 1000; // 5 minutes

// ---- CATALOG CACHE ----------------------------------
let catalogCache = null;
let catalogAt = 0;

async function loadCatalog() {
  const now = Date.now();
  if (catalogCache && now - catalogAt < CATALOG_TTL) return catalogCache;

  try {
    const [cats, prods] = await Promise.all([rocky.getCategories(), rocky.getProducts()]);

    const catNames = {};
    cats.forEach((c) => {
      catNames[c.id] = c.name;
    });

    const products = [];
    prods.forEach((p) => {
      const cost = Number(p.price);
      if (p.status && p.status !== "active") return;
      if (!Number.isFinite(cost) || cost <= 0) return;
      products.push({
        id: Number(p.id),
        categoryId: Number(p.category_id),
        categoryName: catNames[p.category_id] || "Other",
        name: p.name,
        description: p.description || "",
        image: p.image || "",
        inStock: Number(p.in_stock) === 1,
        cost,
        unitPrice: Math.ceil(cost * STORE_MARKUP),
      });
    });

    catalogCache = {
      categories: cats.map((c) => ({ id: Number(c.id), name: c.name })),
      products,
    };
    catalogAt = now;
    return catalogCache;
  } catch (error) {
    if (catalogCache) return catalogCache; // serve stale rather than fail
    throw error;
  }
}

// ---- HELPERS ----------------------------------------
async function createTx(order) {
  try {
    await Transaction.create({
      user: order.user,
      type: "store_purchase",
      amount: order.price,
      status: "pending",
      description: `Store purchase: ${order.productName} x${order.quantity}`,
      paymentReference: String(order._id),
    });
  } catch (e) {
    console.error("store createTx failed:", e.message);
  }
}

async function setTx(order, status, refunded) {
  try {
    await Transaction.updateOne(
      { paymentReference: String(order._id), type: "store_purchase" },
      { $set: { status, refunded } }
    );
  } catch (e) {
    console.error("store setTx failed:", e.message);
  }
}

// Claims the order atomically (so it can only be refunded once), then credits the wallet.
async function refundOrder(orderId, fromStatuses, toStatus, reason) {
  const claimed = await StoreOrder.findOneAndUpdate(
    { _id: orderId, refunded: false, status: { $in: fromStatuses } },
    { $set: { status: toStatus, refunded: true, failReason: reason } },
    { new: true }
  );
  if (!claimed) return null;

  await User.findByIdAndUpdate(claimed.user, { $inc: { balance: claimed.price } });
  await setTx(claimed, "failed", true);
  return claimed;
}

function publicOrder(order) {
  return {
    _id: order._id,
    productName: order.productName,
    categoryName: order.categoryName,
    quantity: order.quantity,
    unitPrice: order.unitPrice,
    price: order.price,
    status: order.status,
    refunded: order.refunded,
    createdAt: order.createdAt,
  };
}

function safeDecrypt(text) {
  try {
    return decrypt(text);
  } catch (e) {
    return "";
  }
}

// ---- GET CATALOG ------------------------------------
// GET /api/store/catalog
const getCatalog = async (req, res) => {
  try {
    const { categories, products } = await loadCatalog();
    const used = new Set(products.map((p) => p.categoryId));
    res.status(200).json({
      categories: categories.filter((c) => used.has(c.id)),
      products: products.map(({ cost, ...rest }) => rest),
    });
  } catch (error) {
    console.error("store catalog failed:", error.message);
    res.status(503).json({ message: "The store is temporarily unavailable. Please try again." });
  }
};

// ---- PLACE ORDER ------------------------------------
// POST /api/store/order   body: { productId, quantity }
const createOrder = async (req, res) => {
  let order = null;
  try {
    if (!rocky.isConfigured()) {
      return res.status(503).json({ message: "The store is temporarily unavailable." });
    }

    const productId = Number(req.body.productId);
    const qty = Number(req.body.quantity);

    if (!Number.isInteger(productId) || productId <= 0) {
      return res.status(400).json({ message: "Invalid item" });
    }
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) {
      return res.status(400).json({ message: `Quantity must be between 1 and ${MAX_QTY}` });
    }

    let catalog;
    try {
      catalog = await loadCatalog();
    } catch (e) {
      return res.status(503).json({ message: "The store is temporarily unavailable. Please try again." });
    }

    const product = catalog.products.find((p) => p.id === productId);
    if (!product) return res.status(400).json({ message: "Item not found" });
    if (!product.inStock) return res.status(400).json({ message: "This item is out of stock" });

    const price = product.unitPrice * qty;

    // Atomically charge the buyer, only if they have enough balance.
    const buyer = await User.findOneAndUpdate(
      { _id: req.user._id, balance: { $gte: price } },
      { $inc: { balance: -price } },
      { new: true }
    );
    if (!buyer) return res.status(400).json({ message: "Insufficient balance" });

    // Save the order (with its idempotency key) BEFORE calling the supplier.
    try {
      order = await StoreOrder.create({
        user: buyer._id,
        productId: product.id,
        productName: product.name,
        categoryName: product.categoryName,
        quantity: qty,
        unitPrice: product.unitPrice,
        price,
        idempotencyKey: "danmus-" + crypto.randomUUID(),
        status: "pending",
      });
    } catch (e) {
      console.error("store order create failed:", e.message);
      await User.findByIdAndUpdate(buyer._id, { $inc: { balance: price } });
      return res.status(500).json({ message: "Failed to place order. You have not been charged." });
    }

    await createTx(order);

    // Call the supplier.
    let result;
    try {
      result = await rocky.placeOrder(product.id, qty, order.idempotencyKey);
    } catch (netError) {
      // Timeout / network error: outcome unknown. Do NOT refund automatically.
      console.error("store supplier call unclear:", String(order._id), netError.message);
      order.status = "review";
      order.failReason = "Network/timeout: " + netError.message;
      await order.save();
      await setTx(order, "pending", false);
      return res.status(202).json({
        message: "Your order is being confirmed. Check your store orders shortly.",
        order: publicOrder(order),
        balance: buyer.balance,
      });
    }

    const { httpStatus, body } = result;
    const supplierMsg = body && body.message ? String(body.message) : "";

    // SUCCESS
    if (httpStatus === 200 && body && body.status === "success" && body.data) {
      const d = body.data;
      const creds = (Array.isArray(d.credentials) ? d.credentials : []).filter((c) => c && c.details);

      order.supplierOrderId = d.order_id ? String(d.order_id) : undefined;
      order.supplierCost = Number(d.total_price) || undefined;
      order.credentials = creds.map((c) => ({
        details: encrypt(String(c.details)),
        link: c.link ? String(c.link) : "",
      }));

      if (creds.length >= qty) {
        order.status = "completed";
      } else {
        order.status = "review";
        order.failReason = `Supplier delivered ${creds.length} of ${qty}`;
      }
      await order.save();
      await setTx(order, order.status === "completed" ? "successful" : "pending", false);

      return res.status(200).json({
        message: order.status === "completed" ? "Purchase successful" : "Your order is being confirmed.",
        order: publicOrder(order),
        balance: buyer.balance,
      });
    }

    // CLEAR REJECTION: supplier did not place the order, so refund automatically.
    if ([400, 401, 403, 404, 422, 429].includes(httpStatus)) {
      console.error("store supplier rejected:", String(order._id), httpStatus, supplierMsg);
      await refundOrder(order._id, ["pending"], "failed", supplierMsg || "HTTP " + httpStatus);
      const fresh = await User.findById(buyer._id).select("balance");
      return res.status(400).json({
        message: "This item is temporarily unavailable. You have not been charged.",
        balance: fresh ? fresh.balance : undefined,
      });
    }

    // ANYTHING ELSE (5xx, odd response): outcome unclear, hold for review.
    console.error("store supplier unclear:", String(order._id), httpStatus, supplierMsg);
    order.status = "review";
    order.failReason = "Supplier HTTP " + httpStatus + (supplierMsg ? ": " + supplierMsg : "");
    await order.save();
    await setTx(order, "pending", false);
    return res.status(202).json({
      message: "Your order is being confirmed. Check your store orders shortly.",
      order: publicOrder(order),
      balance: buyer.balance,
    });
  } catch (error) {
    console.error("store createOrder failed:", error.message);
    if (order) {
      try {
        await StoreOrder.updateOne(
          { _id: order._id, status: "pending" },
          { $set: { status: "review", failReason: "Server error: " + error.message } }
        );
      } catch (e) {
        console.error("store review mark failed:", e.message);
      }
      return res.status(500).json({
        message: "Something went wrong. Your order is being checked, see your store orders.",
      });
    }
    return res.status(500).json({ message: "Failed to place order. Please try again." });
  }
};

// ---- MY ORDERS --------------------------------------
// GET /api/store/orders/mine
const getMyOrders = async (req, res) => {
  try {
    const orders = await StoreOrder.find({ user: req.user._id })
      .select("-credentials")
      .sort({ createdAt: -1 })
      .limit(100);
    res.status(200).json(orders.map(publicOrder));
  } catch (error) {
    res.status(500).json({ message: "Failed to load orders" });
  }
};

// ---- ONE ORDER + LOGIN DETAILS (owner only) ---------
// GET /api/store/orders/:id
const getOrder = async (req, res) => {
  try {
    const order = await StoreOrder.findOne({ _id: req.params.id, user: req.user._id });
    if (!order) return res.status(404).json({ message: "Order not found" });

    res.status(200).json({
      ...publicOrder(order),
      credentials: (order.credentials || []).map((c) => ({
        details: safeDecrypt(c.details),
        link: c.link || "",
      })),
    });
  } catch (error) {
    res.status(404).json({ message: "Order not found" });
  }
};

// ---- ADMIN ------------------------------------------
// GET /api/store/admin/balance
const getSupplierBalance = async (req, res) => {
  try {
    const d = await rocky.getBalance();
    res.status(200).json({ balance: d.balance, currency: d.currency });
  } catch (error) {
    res.status(500).json({ message: "Could not read supplier balance: " + error.message });
  }
};

// GET /api/store/admin/review
const getReviewOrders = async (req, res) => {
  try {
    const orders = await StoreOrder.find({ status: "review" })
      .select("-credentials")
      .populate("user", "name email")
      .sort({ createdAt: -1 });
    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/store/admin/orders/:id/refund
const adminRefund = async (req, res) => {
  try {
    const refunded = await refundOrder(req.params.id, ["review"], "refunded", "Refunded by admin");
    if (!refunded) {
      return res.status(400).json({ message: "Order not found, or not in review, or already refunded" });
    }
    res.status(200).json({ message: "Order refunded", order: publicOrder(refunded) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getCatalog,
  createOrder,
  getMyOrders,
  getOrder,
  getSupplierBalance,
  getReviewOrders,
  adminRefund,
};