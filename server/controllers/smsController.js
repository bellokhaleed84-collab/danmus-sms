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
      "https://open.er-api.com/v6/latest/USD"
    );
    cachedRate = response.data.rates.NGN;
    cachedAt = now;
    console.log("Exchange rate fetched:", cachedRate);
    return cachedRate;
  } catch (error) {
    console.error("Exchange rate fetch failed:", error.message);
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
    console.log(`SMSPool price for ${countryCode}/${serviceName}:`, response.data);
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
      netherlands: { text_en: "Netherlands" },
    };
    return res.status(200).json(countries);
  }
};

// ── GET PRODUCTS BY COUNTRY ──────────────────
// ── GET PRODUCTS BY COUNTRY ──────────────────
const getProducts = async (req, res) => {
  try {
    const { country } = req.params;
    const usdToNgn = await getUsdToNgnRate();
    const grouped = {};

    // Only show these services — ones we actually support
    const SUPPORTED_SERVICES = [
      "whatsapp", "telegram", "google",
      "facebook", "tiktok", "instagram",
      "twitter", "discord",
    ];

    function addEntry(serviceSlug, providerKey, priceNgnOrNull, qty) {
      if (!qty || qty <= 0) return;
      if (!SUPPORTED_SERVICES.includes(serviceSlug.toLowerCase())) return;
      if (!grouped[serviceSlug]) grouped[serviceSlug] = { providers: {} };
      grouped[serviceSlug].providers[providerKey] = {
        label: PROVIDER_LABELS[providerKey],
        price: priceNgnOrNull,
        qty,
      };
    }

    // ── 5sim (Provider 2) ──
    try {
      const response = await axios.get(
        `${FIVESIM_API}/guest/products/${country}/any`,
        { headers: fivesimHeaders, timeout: 5000 }
      );
      Object.keys(response.data).forEach((service) => {
        const p = response.data[service];
        const ngnPrice = Math.ceil(p.Price * usdToNgn * MARKUP);
        addEntry(service, "fivesim", ngnPrice, p.Qty || 0);
      });
      console.log("5sim products fetched ✅");
    } catch (error) {
      console.log("5sim products failed:", error.message);
    }

    // ── SMSPool (Provider 1) — fetch real prices ──
    const isoCountry = SMSPOOL_ISO_COUNTRY[country.toLowerCase()];
    if (isoCountry) {
      for (const slug of SUPPORTED_SERVICES) {
        const serviceName = SMSPOOL_SERVICE_NAME[slug];
        if (!serviceName) continue;
        const price = await getSmsPoolPrice(isoCountry, serviceName, usdToNgn);
        addEntry(slug, "smspool", price, 1);
      }
      console.log("SMSPool prices fetched ✅");
    } else {
      for (const slug of SUPPORTED_SERVICES) {
        if (!SMSPOOL_SERVICE_NAME[slug]) continue;
        addEntry(slug, "smspool", null, 1);
      }
      console.log("SMSPool: country not mapped, checkout pricing");
    }

    // ── Grizzly (Provider 3) ──
    for (const slug of SUPPORTED_SERVICES) {
      addEntry(slug, "grizzly", null, 1);
    }
    console.log("Grizzly listed ✅");

    return res.status(200).json(grouped);
  } catch (error) {
    console.error("Products fetch failed:", error.message);
    res.status(500).json({ message: "Service temporarily unavailable." });
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

    if (lockedKeys.includes(service.toLowerCase()) || lockedKeys.includes(provider)) {
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
      console.log("SMSPool buy response:", response.data);
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
      console.log("5sim buy response:", data);
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

    // ── Grizzly (Provider 3) ──
    if (provider === "grizzly") {
      try {
        const countriesResp = await axios.get(GRIZZLY_API, {
          params: { api_key: process.env.GRIZZLY_API_KEY, action: "getCountries" },
          timeout: 5000,
        });
        console.log("Grizzly countries:", JSON.stringify(countriesResp.data).slice(0, 500));
      } catch (e) {
        console.log("Grizzly getCountries failed:", e.message);
      }
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
      console.log("SMSPool check response:", response.data);
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
  getCountries,
  getProducts,
  buySMS,
  checkSMS,
  cancelOrder,
  getSmsHistory,
};