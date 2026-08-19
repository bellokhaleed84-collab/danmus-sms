const User = require("../models/User");
const Transaction = require("../models/Transaction");
const ServiceControl = require("../models/ServiceControl");
const axios = require("axios");

const FIVESIM_API = "https://5sim.net/v1";
const GRIZZLY_API = "https://api.grizzlysms.com/stubs/handler_api.php";
const SMSPOOL_API = "https://api.smspool.net/stubs/handler_api";
const MARKUP = 1.8;

const fivesimHeaders = {
  Authorization: `Bearer ${process.env.FIVESIM_API_KEY}`,
  Accept: "application/json",
};

// ── SMSPOOL ID MAPPING ────────────────────────
const SMSPOOL_COUNTRY_MAP = {
  usa: 1,
  russia: 4,
  kazakhstan: 7,
  thailand: 52,
  mexico: 53,
  pakistan: 62,
};

const SMSPOOL_SERVICE_MAP = {
  whatsapp: 1012,
  telegram: 907,
  google: 395,
  facebook: 329,
  tiktok: 924,
  instagram: 457,
};

const SMSPOOL_SERVICE_MAP_REVERSE = Object.fromEntries(
  Object.entries(SMSPOOL_SERVICE_MAP).map(([slug, id]) => [String(id), slug])
);

// ── EXCHANGE RATE CACHE ───────────────────────
let cachedRate = null;
let cachedAt = 0;
const ONE_HOUR = 60 * 60 * 1000;

async function getUsdToNgnRate() {
  const now = Date.now();
  if (cachedRate && now - cachedAt < ONE_HOUR) return cachedRate;
  try {
    const response = await axios.get(
      "https://api.frankfurter.dev/v2/latest?base=USD&symbols=NGN"
    );
    cachedRate = response.data.rates.NGN;
    cachedAt = now;
    return cachedRate;
  } catch (error) {
    console.error("Exchange rate fetch failed:", error.message);
    return cachedRate || 1600;
  }
}

// ── HELPER: parse SMS-Activate-style plain text response ──
function parseHandlerApiResponse(data) {
  if (typeof data !== "string") return { status: "ERROR", raw: data };
  if (data.startsWith("ACCESS_NUMBER:")) {
    const parts = data.split(":");
    return { status: "ACCESS_NUMBER", id: parts[1], phone: parts[2] };
  }
  if (data.startsWith("STATUS_OK:")) {
    return { status: "STATUS_OK", code: data.split(":")[1] };
  }
  if (data.startsWith("STATUS_WAIT_CODE")) return { status: "STATUS_WAIT_CODE" };
  if (data.startsWith("STATUS_CANCEL")) return { status: "STATUS_CANCEL" };
  return { status: data };
}

// ── GET COUNTRIES ─────────────────────────────
const getCountries = async (req, res) => {
  try {
    const response = await axios.get(`${FIVESIM_API}/guest/countries`, {
      headers: fivesimHeaders,
      timeout: 5000,
    });
    return res.status(200).json(response.data);
  } catch (error) {
    console.log("5sim countries failed, using static list");
    const countries = {
      russia: { text_en: "Russia" },
      ukraine: { text_en: "Ukraine" },
      usa: { text_en: "United States" },
      england: { text_en: "United Kingdom" },
      china: { text_en: "China" },
      india: { text_en: "India" },
      indonesia: { text_en: "Indonesia" },
      philippines: { text_en: "Philippines" },
      brazil: { text_en: "Brazil" },
      kenya: { text_en: "Kenya" },
      ghana: { text_en: "Ghana" },
      nigeria: { text_en: "Nigeria" },
      egypt: { text_en: "Egypt" },
      pakistan: { text_en: "Pakistan" },
      bangladesh: { text_en: "Bangladesh" },
      vietnam: { text_en: "Vietnam" },
      thailand: { text_en: "Thailand" },
      malaysia: { text_en: "Malaysia" },
      myanmar: { text_en: "Myanmar" },
      ethiopia: { text_en: "Ethiopia" },
      tanzania: { text_en: "Tanzania" },
      colombia: { text_en: "Colombia" },
      mexico: { text_en: "Mexico" },
      kazakhstan: { text_en: "Kazakhstan" },
      uzbekistan: { text_en: "Uzbekistan" },
      cambodia: { text_en: "Cambodia" },
      nepal: { text_en: "Nepal" },
    };
    return res.status(200).json(countries);
  }
};

// ── GET PRODUCTS BY COUNTRY (grouped by provider) ──────────────────
// Returns: { <serviceSlug>: { providers: { smspool?, fivesim?, grizzly? } } }
const getProducts = async (req, res) => {
  try {
    const { country } = req.params;
    const usdToNgn = await getUsdToNgnRate();
    const grouped = {};

    function addEntry(serviceSlug, providerKey, label, usdCost, qty) {
      if (!qty || qty <= 0) return;
      const ngnPrice = Math.ceil(usdCost * usdToNgn * MARKUP);
      if (!grouped[serviceSlug]) grouped[serviceSlug] = { providers: {} };
      grouped[serviceSlug].providers[providerKey] = { label, price: ngnPrice, qty };
    }

    // ── 5sim (Provider 2) ──
    try {
      const response = await axios.get(
        `${FIVESIM_API}/guest/products/${country}/any`,
        { headers: fivesimHeaders, timeout: 5000 }
      );
      Object.keys(response.data).forEach((service) => {
        const p = response.data[service];
        addEntry(service, "fivesim", "Provider 2", p.Price, p.Qty || 0);
      });
      console.log("5sim products fetched ✅");
    } catch (error) {
      console.log("5sim products failed:", error.message);
    }

    // ── Grizzly (Provider 3) ──
    try {
      const response = await axios.get(GRIZZLY_API, {
        params: {
          api_key: process.env.GRIZZLY_API_KEY,
          action: "getPrices",
          country: country,
        },
        timeout: 5000,
      });
      const data = response.data;
      if (data && typeof data === "object") {
        Object.keys(data).forEach((service) => {
          const serviceData = data[service];
          if (serviceData && typeof serviceData === "object") {
            const operators = Object.values(serviceData);
            if (operators.length > 0) {
              const cheapest = operators.reduce((min, op) =>
                op.cost < min.cost ? op : min
              );
              addEntry(service, "grizzly", "Provider 3", cheapest.cost, cheapest.count || 0);
            }
          }
        });
      }
      console.log("Grizzly products fetched ✅");
    } catch (error) {
      console.log("Grizzly products failed:", error.message);
    }

    // ── SMSPool (Provider 1) — only for mapped countries ──
    const smspoolCountryId = SMSPOOL_COUNTRY_MAP[country.toLowerCase()];
    if (smspoolCountryId) {
      try {
        const response = await axios.get(SMSPOOL_API, {
          params: {
            api_key: process.env.SMSPOOL_API_KEY,
            action: "getPrices",
            country: smspoolCountryId,
            setting: "smspool",
          },
          timeout: 5000,
        });
        const data = response.data;
        if (data && typeof data === "object") {
          Object.keys(data).forEach((serviceIdKey) => {
            const slug = SMSPOOL_SERVICE_MAP_REVERSE[serviceIdKey];
            if (!slug) return;
            const serviceData = data[serviceIdKey];
            if (serviceData && typeof serviceData === "object") {
              const operators = Object.values(serviceData);
              if (operators.length > 0) {
                const cheapest = operators.reduce((min, op) =>
                  op.cost < min.cost ? op : min
                );
                addEntry(slug, "smspool", "Provider 1", cheapest.cost, cheapest.count || 0);
              }
            }
          });
        }
        console.log("SMSPool products fetched ✅");
      } catch (error) {
        console.log("SMSPool products failed:", error.message);
      }
    }

    return res.status(200).json(grouped);

  } catch (error) {
    console.error("Products fetch failed:", error.message);
    res.status(500).json({ message: "Service temporarily unavailable. Please try again." });
  }
};

// ── PER-PROVIDER LIVE PRICE LOOKUP (used at purchase time) ──────────
async function getFivesimPrice(country, service) {
  const response = await axios.get(
    `${FIVESIM_API}/guest/products/${country}/any`,
    { headers: fivesimHeaders, timeout: 5000 }
  );
  const p = response.data[service];
  if (!p) return null;
  const usdToNgn = await getUsdToNgnRate();
  return { price: Math.ceil(p.Price * usdToNgn * MARKUP), qty: p.Qty || 0 };
}

async function getGrizzlyPrice(country, service) {
  const response = await axios.get(GRIZZLY_API, {
    params: {
      api_key: process.env.GRIZZLY_API_KEY,
      action: "getPrices",
      country,
      service,
    },
    timeout: 5000,
  });
  const serviceData = response.data?.[service];
  if (!serviceData) return null;
  const operators = Object.values(serviceData);
  if (!operators.length) return null;
  const cheapest = operators.reduce((min, op) => (op.cost < min.cost ? op : min));
  const usdToNgn = await getUsdToNgnRate();
  return { price: Math.ceil(cheapest.cost * usdToNgn * MARKUP), qty: cheapest.count || 0 };
}

async function getSmspoolPrice(country, service) {
  const countryId = SMSPOOL_COUNTRY_MAP[country.toLowerCase()];
  const serviceId = SMSPOOL_SERVICE_MAP[service.toLowerCase()];
  if (!countryId || !serviceId) return null;

  const response = await axios.get(SMSPOOL_API, {
    params: {
      api_key: process.env.SMSPOOL_API_KEY,
      action: "getPrices",
      country: countryId,
      service: serviceId,
      setting: "smspool",
    },
    timeout: 5000,
  });
  const data = response.data;
  const serviceData = data?.[serviceId] || data?.[String(serviceId)];
  if (!serviceData) return null;
  const operators = Object.values(serviceData);
  if (!operators.length) return null;
  const cheapest = operators.reduce((min, op) => (op.cost < min.cost ? op : min));
  const usdToNgn = await getUsdToNgnRate();
  return { price: Math.ceil(cheapest.cost * usdToNgn * MARKUP), qty: cheapest.count || 0 };
}

// ── BUY NUMBER ─────────────────────────────────
// User explicitly picks the provider on the frontend — no auto-fallback.
// Price is re-verified server-side right before purchase.
const buySMS = async (req, res) => {
  try {
    const { country, service, provider } = req.body;

    if (!country || !service || !provider) {
      return res.status(400).json({
        message: "Country, service and provider are required",
      });
    }

    if (!["smspool", "fivesim", "grizzly"].includes(provider)) {
      return res.status(400).json({ message: "Invalid provider" });
    }

    const user = await User.findById(req.user._id);

    const lockedItems = await ServiceControl.find({ locked: true });
    const lockedKeys = lockedItems.map((item) => item.key.toLowerCase());

    const providerLockKey = provider === "fivesim" ? "5sim" : provider;
    if (lockedKeys.includes(service.toLowerCase()) || lockedKeys.includes(providerLockKey)) {
      return res.status(400).json({
        message: "This option is currently unavailable. Please try another.",
      });
    }

    let priceInfo = null;
    try {
      if (provider === "smspool") priceInfo = await getSmspoolPrice(country, service);
      else if (provider === "fivesim") priceInfo = await getFivesimPrice(country, service);
      else if (provider === "grizzly") priceInfo = await getGrizzlyPrice(country, service);
    } catch (priceError) {
      console.log("Price lookup failed:", priceError.message);
    }

    if (!priceInfo || priceInfo.qty <= 0) {
      return res.status(400).json({
        message: "This provider no longer has that number available. Please pick another provider.",
      });
    }

    const smsCost = priceInfo.price;

    if (user.balance < smsCost) {
      return res.status(400).json({ message: "Insufficient balance" });
    }

    let order = null;

    if (provider === "smspool") {
      const countryId = SMSPOOL_COUNTRY_MAP[country.toLowerCase()];
      const serviceId = SMSPOOL_SERVICE_MAP[service.toLowerCase()];
      const response = await axios.get(SMSPOOL_API, {
        params: {
          api_key: process.env.SMSPOOL_API_KEY,
          action: "getNumber",
          service: serviceId,
          country: countryId,
          setting: "smspool",
        },
        timeout: 8000,
      });
      console.log("SMSPool buy response:", response.data);
      const parsed = parseHandlerApiResponse(response.data);
      if (parsed.status !== "ACCESS_NUMBER") {
        return res.status(400).json({
          message: "No numbers available right now from this provider. Please pick another.",
        });
      }
      order = { id: parsed.id, phone: parsed.phone, country, service, price: smsCost };

    } else if (provider === "fivesim") {
      const response = await axios.get(
        `${FIVESIM_API}/user/buy/activation/${country}/any/${service}`,
        { headers: fivesimHeaders, timeout: 8000 }
      );
      const data = response.data;
      console.log("5sim buy response:", data);
      if (!data?.id || !data?.phone || data.phone === "" || data.phone.includes("no free")) {
        return res.status(400).json({
          message: "No numbers available right now from this provider. Please pick another.",
        });
      }
      order = {
        id: String(data.id),
        phone: data.phone,
        country: data.country,
        service: data.product,
        price: smsCost,
      };

    } else if (provider === "grizzly") {
      const response = await axios.get(GRIZZLY_API, {
        params: {
          api_key: process.env.GRIZZLY_API_KEY,
          action: "getNumber",
          service,
          country,
        },
        timeout: 8000,
      });
      console.log("Grizzly buy response:", response.data);
      const parsed = parseHandlerApiResponse(response.data);
      if (parsed.status !== "ACCESS_NUMBER") {
        return res.status(400).json({
          message: "No numbers available right now from this provider. Please pick another.",
        });
      }
      order = { id: parsed.id, phone: parsed.phone, country, service, price: smsCost };
    }

    user.balance -= smsCost;
    await user.save();

    await Transaction.create({
      user: user._id,
      type: "sms_purchase",
      amount: smsCost,
      status: "successful",
      description: `Virtual number for ${service} in ${country} via ${provider}`,
      paymentReference: `${provider}:${order.id}`,
      phone: order.phone,
      country: order.country,
      service: order.service,
    });

    res.status(200).json({
      message: "Number purchased successfully",
      balance: user.balance,
      provider,
      order,
    });

  } catch (error) {
    console.error("Buy failed:", error?.response?.data || error.message);
    res.status(500).json({ message: "Failed to purchase number. Please try again." });
  }
};

// ── CHECK SMS ──────────────────────────────────
const checkSMS = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { provider } = req.query;

    if (!orderId || orderId === "undefined") {
      return res.status(400).json({ message: "Invalid order ID" });
    }

    const cleanId = orderId
      .replace("grizzly:", "")
      .replace("5sim:", "")
      .replace("fivesim:", "")
      .replace("smspool:", "");

    let code = null;

    if (provider === "smspool" || orderId.startsWith("smspool:")) {
      const response = await axios.get(SMSPOOL_API, {
        params: {
          api_key: process.env.SMSPOOL_API_KEY,
          action: "getStatus",
          id: cleanId,
          setting: "smspool",
        },
      });
      console.log("SMSPool check response:", response.data);
      const parsed = parseHandlerApiResponse(response.data);
      if (parsed.status === "STATUS_OK") {
        code = parsed.code;
      } else {
        return res.status(200).json({ sms: [], status: parsed.status });
      }
    } else if (provider === "grizzly" || orderId.startsWith("grizzly:")) {
      const response = await axios.get(GRIZZLY_API, {
        params: {
          api_key: process.env.GRIZZLY_API_KEY,
          action: "getStatus",
          id: cleanId,
        },
      });
      console.log("Grizzly check response:", response.data);
      const parsed = parseHandlerApiResponse(response.data);
      if (parsed.status === "STATUS_OK") {
        code = parsed.code;
      } else {
        return res.status(200).json({ sms: [], status: parsed.status });
      }
    } else {
      const response = await axios.get(
        `${FIVESIM_API}/user/check/${cleanId}`,
        { headers: fivesimHeaders, timeout: 5000 }
      );
      console.log("5sim check response:", response.data);
      const sms = response.data.sms || [];
      if (sms.length > 0) {
        code = sms[0].code;
      } else {
        return res.status(200).json(response.data);
      }
    }

    if (code) {
      await Transaction.findOneAndUpdate(
        { paymentReference: { $regex: cleanId } },
        { otp: code }
      );
    }

    return res.status(200).json({
      sms: [{ code, text: `Your OTP code: ${code}` }],
    });

  } catch (error) {
    console.error("Check SMS error:", error?.response?.data || error.message);
    res.status(500).json({ message: error.message });
  }
};

// ── CANCEL ORDER ───────────────────────────────
const cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { provider } = req.query;

    const cleanId = orderId
      .replace("grizzly:", "")
      .replace("5sim:", "")
      .replace("fivesim:", "")
      .replace("smspool:", "");

    if (provider === "smspool" || orderId.startsWith("smspool:")) {
      await axios.get(SMSPOOL_API, {
        params: {
          api_key: process.env.SMSPOOL_API_KEY,
          action: "setStatus",
          id: cleanId,
          status: 8,
          setting: "smspool",
        },
      });
    } else if (provider === "grizzly" || orderId.startsWith("grizzly:")) {
      await axios.get(GRIZZLY_API, {
        params: {
          api_key: process.env.GRIZZLY_API_KEY,
          action: "setStatus",
          id: cleanId,
          status: 8,
        },
      });
    } else {
      await axios.get(
        `${FIVESIM_API}/user/cancel/${cleanId}`,
        { headers: fivesimHeaders, timeout: 5000 }
      );
    }

    const transaction = await Transaction.findOne({
      paymentReference: { $regex: cleanId },
    });

    if (transaction) {
      const user = await User.findById(transaction.user);
      if (user) {
        user.balance += transaction.amount;
        await user.save();
        return res.status(200).json({
          message: "Order cancelled and balance refunded",
          balance: user.balance,
        });
      }
    }

    res.status(200).json({ message: "Order cancelled successfully" });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── GET SMS HISTORY ────────────────────────────
const getSmsHistory = async (req, res) => {
  try {
    const transactions = await Transaction.find({
      user: req.user._id,
      type: "sms_purchase",
    }).sort({ createdAt: -1 });

    res.status(200).json(transactions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getCountries,
  getProducts,
  buySMS,
  checkSMS,
  cancelOrder,
  getSmsHistory,
};