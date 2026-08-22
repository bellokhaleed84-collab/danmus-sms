const User = require("../models/User");
const Transaction = require("../models/Transaction");
const ServiceControl = require("../models/ServiceControl");
const axios = require("axios");

const FIVESIM_API = "https://5sim.net/v1";
const GRIZZLY_API = "https://api.grizzlysms.com/stubs/handler_api.php";
const SMSPOOL_API = "https://api.smspool.net";

const MARKUP = 1.8;

const fivesimHeaders = {
  Authorization: `Bearer ${process.env.FIVESIM_API_KEY}`,
  Accept: "application/json",
};

const PROVIDER_LABELS = {
  smspool: "Provider 1",
  fivesim: "Provider 2",
  grizzly: "Provider 3",
};
const PROVIDER_ORDER = ["smspool", "fivesim", "grizzly"];

const SMSPOOL_ISO_COUNTRY = {
  usa: "US",
  russia: "RU",
  kazakhstan: "KZ",
  thailand: "TH",
  mexico: "MX",
  pakistan: "PK",
  netherlands: "NL",
  ukraine: "UA",
  india: "IN",
  indonesia: "ID",
  philippines: "PH",
  brazil: "BR",
  kenya: "KE",
  ghana: "GH",
  nigeria: "NG",
  egypt: "EG",
  bangladesh: "BD",
  vietnam: "VN",
  malaysia: "MY",
  myanmar: "MM",
  ethiopia: "ET",
  tanzania: "TZ",
  colombia: "CO",
  uzbekistan: "UZ",
  cambodia: "KH",
  nepal: "NP",
  china: "CN",
  england: "GB",
};

const SMSPOOL_SERVICE_NAME = {
  whatsapp: "WhatsApp",
  telegram: "Telegram",
  google: "Google",
  facebook: "Facebook",
  tiktok: "TikTok",
  instagram: "Instagram",
  twitter: "Twitter",
  discord: "Discord",
};

const GRIZZLY_SERVICES = [
  "whatsapp", "telegram", "google",
  "facebook", "tiktok", "instagram",
];

// Fallback / display-name country list, shared across providers
const STATIC_COUNTRIES = {
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
  netherlands: { text_en: "Netherlands" },
};

// ── EXCHANGE RATE CACHE ───────────────────────
let cachedRate = null;
let cachedAt = 0;
const ONE_HOUR = 60 * 60 * 1000;

async function getUsdToNgnRate() {
  const now = Date.now();
  if (cachedRate && now - cachedAt < ONE_HOUR) return cachedRate;
  try {
    // Using open.er-api.com — free, no key, reliable
    const response = await axios.get(
      "https://open.er-api.com/v6/latest/USD",
      { timeout: 6000 }
    );
    cachedRate = response.data.rates.NGN;
    cachedAt = now;
    console.log("Exchange rate fetched:", cachedRate);
    return cachedRate;
  } catch (error) {
    console.error(
      "Exchange rate fetch failed:",
      error.response?.status,
      error.response?.data || error.message
    );
    return cachedRate || 1600;
  }
}

// ── SMSPool price cache (country+service combo) ──
const smspoolPriceCache = {};
const SMSPOOL_PRICE_TTL = 30 * 60 * 1000; // 30 mins

async function getSmsPoolPrice(countryCode, serviceName, usdToNgn) {
  const cacheKey = `${countryCode}:${serviceName}`;
  const cached = smspoolPriceCache[cacheKey];
  if (cached && Date.now() - cached.at < SMSPOOL_PRICE_TTL) {
    return cached.price;
  }
  try {
    const response = await axios.get(`${SMSPOOL_API}/request/price`, {
      params: {
        key: process.env.SMSPOOL_API_KEY,
        country: countryCode,
        service: serviceName,
      },
      timeout: 5000,
    });
    const data = response.data;
    // Response: { success: 1, price: "0.05", ... } or { success: 0 }
    if (data && data.success === 1 && data.price) {
      const ngnPrice = Math.ceil(Number(data.price) * usdToNgn * MARKUP);
      smspoolPriceCache[cacheKey] = { price: ngnPrice, at: Date.now() };
      return ngnPrice;
    }
    return null;
  } catch (error) {
    console.log(`SMSPool price fetch failed for ${countryCode}/${serviceName}:`, error.message);
    return null;
  }
}

// ── HELPER: parse Grizzly plain text response ──
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

function isLockedForService(lockedKeys, provider, service) {
  return (
    lockedKeys.includes(provider) ||
    (service && lockedKeys.includes(service.toLowerCase()))
  );
}

// ── GET COUNTRIES (per provider) ──────────────
// GET /:provider/countries
const getProviderCountries = async (req, res) => {
  try {
    const { provider } = req.params;
    if (!PROVIDER_ORDER.includes(provider)) {
      return res.status(400).json({ message: "Invalid provider" });
    }

    if (provider === "fivesim") {
      try {
        const response = await axios.get(`${FIVESIM_API}/guest/countries`, {
          headers: fivesimHeaders,
          timeout: 5000,
        });
        return res.status(200).json({
          provider,
          label: PROVIDER_LABELS[provider],
          countries: response.data,
        });
      } catch (error) {
        console.log("5sim countries failed, using static list:", error.message);
        return res.status(200).json({
          provider,
          label: PROVIDER_LABELS[provider],
          countries: STATIC_COUNTRIES,
        });
      }
    }

    if (provider === "smspool") {
      const countries = {};
      Object.keys(SMSPOOL_ISO_COUNTRY).forEach((slug) => {
        if (STATIC_COUNTRIES[slug]) countries[slug] = STATIC_COUNTRIES[slug];
      });
      return res.status(200).json({
        provider,
        label: PROVIDER_LABELS[provider],
        countries,
      });
    }

    // grizzly — not live yet, flagged so the frontend can grey it out
    return res.status(200).json({
      provider,
      label: PROVIDER_LABELS[provider],
      comingSoon: true,
      countries: STATIC_COUNTRIES,
    });
  } catch (error) {
    console.error("getProviderCountries failed:", error.message);
    res.status(500).json({ message: "Service temporarily unavailable. Please try again." });
  }
};

// ── GET PRODUCTS (per provider + country) ─────
// GET /:provider/products/:country
const getProviderProducts = async (req, res) => {
  try {
    const { provider, country } = req.params;
    if (!PROVIDER_ORDER.includes(provider)) {
      return res.status(400).json({ message: "Invalid provider" });
    }

    const usdToNgn = await getUsdToNgnRate();
    const services = {};

    if (provider === "fivesim") {
      try {
        const response = await axios.get(
          `${FIVESIM_API}/guest/products/${country}/any`,
          { headers: fivesimHeaders, timeout: 5000 }
        );
        Object.keys(response.data).forEach((slug) => {
          const p = response.data[slug];
          if (!p.Qty || p.Qty <= 0) return;
          services[slug] = {
            label: PROVIDER_LABELS[provider],
            price: Math.ceil(p.Price * usdToNgn * MARKUP),
            qty: p.Qty,
          };
        });
        return res.status(200).json({ provider, country, services });
      } catch (error) {
        console.log(`getProviderProducts(fivesim, ${country}) failed:`, error.message);
        return res.status(400).json({
          message: "Provider 2 has no data for this country right now.",
        });
      }
    }

    if (provider === "smspool") {
      const isoCountry = SMSPOOL_ISO_COUNTRY[country.toLowerCase()];
      if (!isoCountry) {
        return res.status(400).json({
          message: "Provider 1 doesn't support this country.",
        });
      }
      for (const slug of Object.keys(SMSPOOL_SERVICE_NAME)) {
        const serviceName = SMSPOOL_SERVICE_NAME[slug];
        const price = await getSmsPoolPrice(isoCountry, serviceName, usdToNgn);
        services[slug] = { label: PROVIDER_LABELS[provider], price, qty: 1 };
      }
      return res.status(200).json({ provider, country, services });
    }

    // grizzly — not live yet; flagged so the frontend can disable checkout
    for (const slug of GRIZZLY_SERVICES) {
      services[slug] = {
        label: PROVIDER_LABELS[provider],
        price: null,
        qty: 1,
        comingSoon: true,
      };
    }
    return res.status(200).json({ provider, country, comingSoon: true, services });
  } catch (error) {
    console.error("getProviderProducts failed:", error.message);
    res.status(500).json({ message: "Service temporarily unavailable. Please try again." });
  }
};

// ── BUY NUMBER ─────────────────────────────────
const buySMS = async (req, res) => {
  try {
    const { country, service, provider, maxPriceNgn } = req.body;

    if (!country || !service || !provider) {
      return res.status(400).json({
        message: "Country, service and provider are required",
      });
    }
    if (!PROVIDER_ORDER.includes(provider)) {
      return res.status(400).json({ message: "Invalid provider selected" });
    }

    const user = await User.findById(req.user._id);

    const lockedItems = await ServiceControl.find({ locked: true });
    const lockedKeys = lockedItems.map((item) => item.key.toLowerCase());

    if (isLockedForService(lockedKeys, provider, service)) {
      return res.status(400).json({
        message: `${PROVIDER_LABELS[provider]} is currently unavailable for ${service}. Please try another option.`,
      });
    }

    const usdToNgn = await getUsdToNgnRate();
    let order = null;
    let smsCost = null;

    // ── SMSPool (Provider 1) ──
    if (provider === "smspool") {
      const isoCountry = SMSPOOL_ISO_COUNTRY[country.toLowerCase()];
      const properService = SMSPOOL_SERVICE_NAME[service.toLowerCase()];
      if (!isoCountry || !properService) {
        return res.status(400).json({
          message: "Provider 1 doesn't support this country/service. Try Provider 2.",
        });
      }
      const response = await axios.post(`${SMSPOOL_API}/purchase/sms`, null, {
        params: {
          key: process.env.SMSPOOL_API_KEY,
          country: isoCountry,
          service: properService,
          ...(maxPriceNgn
            ? { max_price: (Number(maxPriceNgn) / (usdToNgn * MARKUP)).toFixed(2) }
            : {}),
        },
        timeout: 8000,
      });
      const data = response.data;
      if (!data || data.success !== 1 || !data.order_id || !data.phonenumber) {
        const reason =
          data?.type === "OUT_OF_STOCK" ? "No numbers available right now. Try Provider 2." :
          data?.type === "BALANCE_ERROR" ? "Provider 1 balance error — contact support." :
          data?.type === "PRICE_NOT_FOUND" ? "No number at this price. Try Provider 2." :
          data?.message?.includes("whitelist-only") ? "This service needs whitelist access on Provider 1. Try Provider 2." :
          "Provider 1 could not fulfil this order. Try Provider 2.";
        return res.status(400).json({ message: reason });
      }
      smsCost = Math.ceil(Number(data.cost) * usdToNgn * MARKUP);
      order = {
        id: String(data.order_id),
        phone: `${data.cc || ""}${data.phonenumber}`,
        country: data.country || country,
        service: data.service || service,
        price: smsCost,
      };
    }

    // ── 5sim (Provider 2) ──
    if (provider === "fivesim") {
      const response = await axios.get(
        `${FIVESIM_API}/user/buy/activation/${country}/any/${service}`,
        { headers: fivesimHeaders, timeout: 8000 }
      );
      const data = response.data;
      if (!data || !data.id || !data.phone || data.phone === "" || data.phone.includes("no free")) {
        return res.status(400).json({
          message: "Provider 2 has no numbers available right now. Try Provider 3.",
        });
      }
      smsCost = Math.ceil(Number(data.price) * usdToNgn * MARKUP);
      order = {
        id: String(data.id),
        phone: data.phone,
        country: data.country,
        service: data.product,
        price: smsCost,
      };
    }

    // ── Grizzly (Provider 3) — not live yet ──
    if (provider === "grizzly") {
      return res.status(400).json({
        message: "Provider 3 is being configured. Please use Provider 1 or 2.",
      });
    }

    if (user.balance < smsCost) {
      return res.status(400).json({ message: "Insufficient balance" });
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
    console.error("buySMS failed:", error?.response?.data || error.message);
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
      const response = await axios.post(`${SMSPOOL_API}/sms/check`, null, {
        params: { key: process.env.SMSPOOL_API_KEY, orderid: cleanId },
        timeout: 8000,
      });
      const data = response.data;
      if (data?.status === 3 && data.sms) {
        code = data.sms;
      } else {
        return res.status(200).json({ sms: [], status: data?.status ?? "PENDING" });
      }
    } else if (provider === "grizzly" || orderId.startsWith("grizzly:")) {
      const response = await axios.get(GRIZZLY_API, {
        params: { api_key: process.env.GRIZZLY_API_KEY, action: "getStatus", id: cleanId },
      });
      const parsed = parseHandlerApiResponse(response.data);
      if (parsed.status === "STATUS_OK") {
        code = parsed.code;
      } else {
        return res.status(200).json({ sms: [], status: parsed.status });
      }
    } else {
      try {
        const response = await axios.get(
          `${FIVESIM_API}/user/check/${cleanId}`,
          { headers: fivesimHeaders, timeout: 5000 }
        );
        const sms = response.data.sms || [];
        if (sms.length > 0) {
          code = sms[0].code;
        } else {
          return res.status(200).json(response.data);
        }
      } catch (fivesimError) {
        return res.status(500).json({ message: "Failed to check SMS status." });
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
      await axios.post(`${SMSPOOL_API}/sms/cancel`, null, {
        params: { key: process.env.SMSPOOL_API_KEY, orderid: cleanId },
        timeout: 8000,
      });
    } else if (provider === "grizzly" || orderId.startsWith("grizzly:")) {
      await axios.get(GRIZZLY_API, {
        params: { api_key: process.env.GRIZZLY_API_KEY, action: "setStatus", id: cleanId, status: 8 },
      });
    } else {
      try {
        await axios.get(`${FIVESIM_API}/user/cancel/${cleanId}`, {
          headers: fivesimHeaders, timeout: 5000,
        });
      } catch (e) {
        console.log("5sim cancel failed:", e.message);
      }
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
  getProviderCountries,
  getProviderProducts,
  buySMS,
  checkSMS,
  cancelOrder,
  getSmsHistory,
};