const crypto = require("crypto");
const User = require("../models/User");
const Transaction = require("../models/Transaction");
const NumberRental = require("../models/NumberRental");
const NumberMessage = require("../models/NumberMessage");
const telnyx = require("../services/telnyx");
const { getUsdToNgnRate } = require("../services/fx");
const { getSetting, applyMarkup } = require("../services/settings");

const RENTAL_DAYS = 30;
const QUOTE_TTL_MS = 10 * 60 * 1000;
const NUMBER_TYPES = ["local", "toll_free", "mobile", "national"];

// Countries shown in the Rent page. Telnyx availability and rules differ per
// country, so a country with no numbers just shows "none available".
// Add or remove codes here whenever you like.
const COUNTRY_CODES = [
  "US", "CA", "GB", "AU", "NZ", "IE", "FR", "DE", "ES", "IT", "PT", "NL", "BE", "CH", "AT",
  "SE", "NO", "DK", "FI", "PL", "CZ", "RO", "BG", "HU", "GR", "TR", "IL", "AE", "SA", "QA",
  "ZA", "KE", "GH", "NG", "EG", "MA", "MX", "BR", "AR", "CL", "CO", "PE", "IN", "ID", "PH",
  "SG", "HK", "JP", "KR", "TH", "VN", "MY", "PK", "BD", "LK", "UA", "HR", "SK", "SI", "LT",
  "LV", "EE", "IS", "LU", "CY", "MT",
];

let regionNames = null;
try {
  regionNames = new Intl.DisplayNames(["en"], { type: "region" });
} catch (e) {
  regionNames = null;
}

function countryName(code) {
  try {
    return (regionNames && regionNames.of(code)) || code;
  } catch (e) {
    return code;
  }
}

// ---- Signed price quotes --------------------------------------------------
// /available gives each number a signed quote. /rent only trusts the price
// inside a valid quote, so the browser can never change what it pays.
function sign(body) {
  return crypto.createHmac("sha256", process.env.JWT_SECRET).update(body).digest("base64url");
}

function signQuote(data) {
  const body = Buffer.from(JSON.stringify(data)).toString("base64url");
  return body + "." + sign(body);
}

function readQuote(token) {
  if (typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const a = Buffer.from(sig);
  const b = Buffer.from(sign(body));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (!data.exp || Date.now() > data.exp) return null;
    return data;
  } catch (e) {
    return null;
  }
}

function refund(userId, amount) {
  return User.findByIdAndUpdate(userId, { $inc: { balance: amount } });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Telnyx orders finish asynchronously. Wait a little for the result.
async function waitForOrder(orderId) {
  for (let i = 0; i < 8; i++) {
    await sleep(1500);
    try {
      const o = await telnyx.getOrder(orderId);
      if (o.status === "success") return { state: "success" };
      if (o.status === "failure" || o.status === "expired") {
        return { state: "failed", reason: "Telnyx order " + o.status };
      }
    } catch (e) {
      console.error("number order poll failed:", e.message);
    }
  }
  return { state: "unknown" };
}

// ---- GET COUNTRIES ---------------------------------------------------------
// GET /api/numbers/countries
const getCountries = async (req, res) => {
  const list = COUNTRY_CODES.map((code) => ({ value: code, label: countryName(code) })).sort((a, b) =>
    a.label.localeCompare(b.label)
  );
  res.status(200).json({ countries: list, types: NUMBER_TYPES });
};

// ---- SEARCH AVAILABLE NUMBERS ---------------------------------------------
// GET /api/numbers/available?country=US&type=local&startsWith=212
const getAvailable = async (req, res) => {
  try {
    if (!telnyx.isConfigured()) {
      return res.status(503).json({ message: "Number rental is temporarily unavailable." });
    }

    const country = String(req.query.country || "").toUpperCase();
    if (!COUNTRY_CODES.includes(country)) {
      return res.status(400).json({ message: "Unsupported country" });
    }

    const type = req.query.type ? String(req.query.type) : "";
    if (type && !NUMBER_TYPES.includes(type)) {
      return res.status(400).json({ message: "Unsupported number type" });
    }

    const startsWith = String(req.query.startsWith || "").replace(/\D/g, "").slice(0, 6);

    const rows = await telnyx.searchAvailable({ country, type, startsWith, limit: 20 });

    const [fx, s] = await Promise.all([getUsdToNgnRate(), getSetting("numbers")]);

    const numbers = rows
      .filter((r) => r && r.phone_number && r.cost_information)
      .map((r) => {
        const upfront = Number(r.cost_information.upfront_cost) || 0;
        const monthly = Number(r.cost_information.monthly_cost) || 0;
        const price = applyMarkup((upfront + monthly) * fx, s.markupPercent);
        const renewal = applyMarkup(monthly * fx, s.markupPercent);
        const features = (r.features || []).map((f) => f.name).filter(Boolean);
        const region = (r.region_information || []).map((x) => x.region_name).filter(Boolean).join(", ");
        const numberType = r.phone_number_type || type || "";

        return {
          phoneNumber: r.phone_number,
          country,
          numberType,
          region,
          features,
          price, // NGN for the first month
          renewalPrice: renewal, // NGN per month after that
          quote: signQuote({
            phone: r.phone_number,
            country,
            numberType,
            region,
            features,
            price,
            upfront,
            monthly,
            exp: Date.now() + QUOTE_TTL_MS,
          }),
        };
      });

    res.status(200).json({ numbers });
  } catch (error) {
    console.error("getAvailable failed:", telnyx.errorMessage(error));
    res.status(502).json({ message: "Could not load numbers right now. Please try again." });
  }
};

// ---- RENT A NUMBER ---------------------------------------------------------
// POST /api/numbers/rent   body: { quote }
const rentNumber = async (req, res) => {
  let rental = null;
  let price = 0;
  let buyerId = null;

  try {
    if (!telnyx.isConfigured()) {
      return res.status(503).json({ message: "Number rental is temporarily unavailable." });
    }

    const q = readQuote(req.body.quote);
    if (!q) {
      return res.status(400).json({ message: "This offer has expired. Please search again." });
    }
    price = q.price;
    if (!Number.isInteger(price) || price <= 0) {
      return res.status(400).json({ message: "Invalid price. Please search again." });
    }

    // Charge atomically, only if the wallet really has enough.
    const buyer = await User.findOneAndUpdate(
      { _id: req.user._id, balance: { $gte: price } },
      { $inc: { balance: -price } },
      { new: true }
    );
    if (!buyer) return res.status(400).json({ message: "Insufficient balance" });
    buyerId = buyer._id;

    // Save the rental BEFORE calling Telnyx so a crash never loses track of it.
    try {
      rental = await NumberRental.create({
        user: buyer._id,
        phoneNumber: q.phone,
        lockKey: q.phone,
        country: q.country,
        numberType: q.numberType,
        region: q.region,
        features: q.features,
        upfrontCostUsd: q.upfront,
        monthlyCostUsd: q.monthly,
        pricePaid: price,
        status: "pending",
      });
    } catch (e) {
      await refund(buyer._id, price);
      if (e && e.code === 11000) {
        return res.status(400).json({ message: "That number was just taken. Please pick another." });
      }
      console.error("number rental create failed:", e.message);
      return res.status(500).json({ message: "Failed to rent number. You have not been charged." });
    }

    // Place the order with Telnyx.
    let order;
    try {
      order = await telnyx.orderNumber(q.phone);
    } catch (e) {
      if (e.response) {
        // Telnyx clearly rejected it: refund automatically.
        console.error("telnyx order rejected:", telnyx.errorMessage(e));
        rental.status = "failed";
        rental.failReason = telnyx.errorMessage(e);
        rental.lockKey = undefined;
        await rental.save();
        await refund(buyer._id, price);
        const fresh = await User.findById(buyer._id).select("balance");
        return res.status(400).json({
          message: "This number is not available right now. You have not been charged.",
          balance: fresh ? fresh.balance : undefined,
        });
      }
      // Timeout / network: outcome unknown. Do NOT refund automatically.
      console.error("telnyx order unclear:", String(rental._id), e.message);
      rental.status = "provisioning";
      rental.failReason = "Network/timeout: " + e.message;
      await rental.save();
      return res.status(202).json({
        message: "Your number is being set up. Check My Numbers shortly.",
        rental,
        balance: buyer.balance,
      });
    }

    rental.telnyxOrderId = order.orderId;
    await rental.save();

    const result = await waitForOrder(order.orderId);

    if (result.state === "failed") {
      rental.status = "failed";
      rental.failReason = result.reason;
      rental.lockKey = undefined;
      await rental.save();
      await refund(buyer._id, price);
      const fresh = await User.findById(buyer._id).select("balance");
      return res.status(400).json({
        message: "This number could not be activated. You have not been charged.",
        balance: fresh ? fresh.balance : undefined,
      });
    }

    if (result.state === "unknown") {
      rental.status = "provisioning";
      rental.failReason = "Order still pending after wait";
      await rental.save();
      return res.status(202).json({
        message: "Your number is being set up. Check My Numbers shortly.",
        rental,
        balance: buyer.balance,
      });
    }

    // SUCCESS
    try {
      rental.telnyxNumberId = (await telnyx.findNumberId(q.phone)) || undefined;
    } catch (e) {
      console.error("findNumberId failed:", e.message);
    }
    const now = new Date();
    rental.status = "active";
    rental.startedAt = now;
    rental.expiresAt = new Date(now.getTime() + RENTAL_DAYS * 24 * 60 * 60 * 1000);
    await rental.save();

    try {
      await Transaction.create({
        user: buyer._id,
        type: "number_rental",
        amount: price,
        status: "successful",
        description: "Number rental: " + q.phone,
        paymentReference: "number:" + rental._id,
        phone: q.phone,
        country: q.country,
      });
    } catch (e) {
      console.error("number rental tx failed:", e.message);
    }

    return res.status(200).json({
      message: "Number rented successfully",
      rental,
      balance: buyer.balance,
    });
  } catch (error) {
    console.error("rentNumber failed:", error.message);
    if (rental && rental.status === "pending") {
      try {
        rental.status = "provisioning";
        rental.failReason = "Server error: " + error.message;
        await rental.save();
      } catch (e) {
        console.error("number rental review mark failed:", e.message);
      }
      return res.status(500).json({
        message: "Something went wrong. Your number is being checked, see My Numbers.",
      });
    }
    return res.status(500).json({ message: "Failed to rent number. Please try again." });
  }
};

// ---- MY RENTALS -----------------------------------------------------------
// GET /api/numbers/mine
const getMyRentals = async (req, res) => {
  try {
    const rentals = await NumberRental.find({ user: req.user._id })
      .select("-failReason -telnyxOrderId -telnyxNumberId -lockKey")
      .sort({ createdAt: -1 })
      .limit(100);
    res.status(200).json(rentals);
  } catch (error) {
    res.status(500).json({ message: "Failed to load your numbers" });
  }
};

// ---- INBOX FOR ONE NUMBER (owner only) -------------------------------------
// GET /api/numbers/:id/messages
const getMessages = async (req, res) => {
  try {
    const rental = await NumberRental.findOne({ _id: req.params.id, user: req.user._id });
    if (!rental) return res.status(404).json({ message: "Number not found" });

    const messages = await NumberMessage.find({ rental: rental._id })
      .select("from to text code receivedAt")
      .sort({ receivedAt: -1 })
      .limit(100);

    res.status(200).json({
      phoneNumber: rental.phoneNumber,
      status: rental.status,
      expiresAt: rental.expiresAt,
      messages,
    });
  } catch (error) {
    res.status(404).json({ message: "Number not found" });
  }
};

// ---- ADMIN: ALL RENTALS ---------------------------------------------------
// GET /api/numbers/admin/rentals
const getAdminRentals = async (req, res) => {
  try {
    const rentals = await NumberRental.find()
      .populate("user", "name email")
      .sort({ createdAt: -1 })
      .limit(200);
    res.status(200).json(rentals);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ---- TELNYX WEBHOOK (raw body; mounted before express.json in app.js) -----
// POST /api/numbers/webhook
const webhook = async (req, res) => {
  const raw = req.body; // Buffer
  if (
    !telnyx.verifyWebhook(raw, req.headers["telnyx-signature-ed25519"], req.headers["telnyx-timestamp"])
  ) {
    return res.status(401).send("Invalid signature");
  }

  try {
    const event = JSON.parse(raw.toString("utf8"));
    const d = event.data || {};

    if (d.event_type === "message.received") {
      const p = d.payload || {};
      const to = p.to && p.to[0] && p.to[0].phone_number;
      const from = p.from && p.from.phone_number;
      const text = p.text || "";

      if (to) {
        const rental = await NumberRental.findOne({ phoneNumber: to, status: "active" });
        if (rental) {
          const m = String(text).match(/\b\d{4,8}\b/);
          try {
            await NumberMessage.create({
              rental: rental._id,
              user: rental.user,
              from,
              to,
              text,
              code: m ? m[0] : undefined,
              telnyxMessageId: p.id ? String(p.id) : undefined,
            });
          } catch (e) {
            if (!(e && e.code === 11000)) throw e; // duplicate delivery is fine
          }
        }
      }
    }

    return res.status(200).send("OK");
  } catch (err) {
    console.error("NUMBER WEBHOOK ERROR:", err.message);
    return res.status(500).send("Error"); // non-200 so Telnyx retries
  }
};

module.exports = {
  getCountries,
  getAvailable,
  rentNumber,
  getMyRentals,
  getMessages,
  getAdminRentals,
  webhook,
};