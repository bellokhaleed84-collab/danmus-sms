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

// Slug -> display label, used by 5sim (Provider 2) and Grizzly (Provider 3),
// whose APIs use fixed slugs. SMSPool (Provider 1) no longer uses this — it
// pulls its own live service catalog per country instead (see below).
const SERVICE_LABELS = {
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

function capitalize(slug) {
  return slug.charAt(0).toUpperCase() + slug.slice(1);
}

function countriesObjectToOptions(obj) {
  return Object.keys(obj).map((slug) => ({
    value: slug,
    label: obj[slug]?.text_en || capitalize(slug),
  }));
}

// Runs async fn(item) over items with at most `limit` in flight at once —
// keeps us well under SMSPool's rate limit when pricing many services.
async function mapWithConcurrency(items, limit, fn) {
  const results = new Array(items.length);
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const current = index++;
      results[current] = await fn(items[current], current);
    }
  }
  const workers = Array.from({ length: Math.min(limit, items.length) }, worker);
  await Promise.all(workers);
  return results;
}

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

// ── SMSPool: live service catalog per country ──
const smspoolServiceListCache = {};
const SMSPOOL_SERVICE_LIST_TTL = 6 * 60 * 60 * 1000; // 6 hours — catalog rarely changes

async function getSmsPoolServices(countryCode) {
  const cached = smspoolServiceListCache[countryCode];
  if (cached && Date.now() - cached.at < SMSPOOL_SERVICE_LIST_TTL) {
    return cached.services;
  }
  const response = await axios.get(`${SMSPOOL_API}/service/retrieve_all`, {
    params: { key: process.env.SMSPOOL_API_KEY, country: countryCode },
    timeout: 8000,
  });
  const services = Array.isArray(response.data) ? response.data : [];
  smspoolServiceListCache[countryCode] = { services, at: Date.now() };
  return services;
}

// ── SMSPool price cache (country+service combo) ──
const smspoolPriceCache = {};
const SMSPOOL_PRICE_TTL = 30 * 60 * 1000; // 30 mins

async function getSmsPoolPrice(countryCode, serviceIdOrName, usdToNgn) {
  const cacheKey = `${countryCode}:${serviceIdOrName}`;
  const cached = smspoolPriceCache[cacheKey];
  if (cached && Date.now() - cached.at < SMSPOOL_PRICE_TTL) {
    return cached.price;
  }
  try {
    const response = await axios.get(`${SMSPOOL_API}/request/price`, {
      params: {
        key: process.env.SMSPOOL_API_KEY,
        country: countryCode,
        service: serviceIdOrName,
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
    console.log(`SMSPool price fetch failed for ${countryCode}/${serviceIdOrName}:`, error.message);
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
    (service && lockedKeys.includes(String(service).toLowerCase()))
  );
}

// ── GET COUNTRIES (per provider) ──────────────
// GET /:provider/countries
// Returns a flat array: [{ value, label }]
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
        return res.status(200).json(countriesObjectToOptions(response.data));
      } catch (error) {
        console.log("5sim countries failed, using static list:", error.message);
        return res.status(200).json(countriesObjectToOptions(STATIC_COUNTRIES));
      }
    }

    if (provider === "smspool") {
      const subset = {};
      Object.keys(SMSPOOL_ISO_COUNTRY).forEach((slug) => {
        if (STATIC_COUNTRIES[slug]) subset[slug] = STATIC_COUNTRIES[slug];
      });
      return res.status(200).json(countriesObjectToOptions(subset));
    }

    // grizzly — not live yet, still list countries so the UI stays consistent;
    // buySMS blocks the actual purchase with a clear "being configured" message.
    return res.status(200).json(countriesObjectToOptions(STATIC_COUNTRIES));
  } catch (error) {
    console.error("getProviderCountries failed:", error.message);
    res.status(500).json({ message: "Service temporarily unavailable. Please try again." });
  }
};

// ── GET PRODUCTS (per provider + country) ─────
// GET /:provider/products/:country
// Returns a flat array: [{ value, label, price, qty }]
const getProviderProducts = async (req, res) => {
  try {
    const { provider, country } = req.params;
    if (!PROVIDER_ORDER.includes(provider)) {
      return res.status(400).json({ message: "Invalid provider" });
    }

    const usdToNgn = await getUsdToNgnRate();

    if (provider === "fivesim") {
      try {
        const response = await axios.get(
          `${FIVESIM_API}/guest/products/${country}/any`,
          { headers: fivesimHeaders, timeout: 5000 }
        );
        const options = Object.keys(response.data)
          .filter((slug) => response.data[slug]?.Qty > 0)
          .map((slug) => ({
            value: slug,
            label: SERVICE_LABELS[slug] || capitalize(slug),
            price: Math.ceil(response.data[slug].Price * usdToNgn * MARKUP),
            qty: response.data[slug].Qty,
          }));
        return res.status(200).json(options);
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

      let smspoolServices = [];
      try {
        smspoolServices = await getSmsPoolServices(isoCountry);
      } catch (error) {
        console.log(`SMSPool service list failed for ${isoCountry}:`, error.message);
        return res.status(400).json({
          message: "Provider 1 has no service data for this country right now.",
        });
      }

      // Price every service SMSPool actually offers for this country,
      // 10 requests in flight at a time to stay under their rate limit.
      const priced = await mapWithConcurrency(smspoolServices, 10, async (svc) => {
        const price = await getSmsPoolPrice(isoCountry, svc.ID, usdToNgn);
        return { value: String(svc.ID), label: svc.name, price, qty: 1 };
      });

      // Drop anything without a confirmed live price — no "price at checkout" placeholders.
      const options = priced
        .filter((o) => o.price != null)
        .sort((a, b) => a.label.localeCompare(b.label));

      return res.status(200).json(options);
    }

    // grizzly — not live yet; price stays null so the frontend shows
    // "price at checkout" (already handled in the UI copy).
    const options = GRIZZLY_SERVICES.map((slug) => ({
      value: slug,
      label: SERVICE_LABELS[slug] || capitalize(slug),
      price: null,
      qty: 1,
    }));
    return res.status(200).json(options);
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
        message: `${PROVIDER_LABELS[provider]} is currently unavailable for this service. Please try another option.`,
      });
    }

    const usdToNgn = await getUsdToNgnRate();
    let order = null;
    let smsCost = null;

    // ── SMSPool (Provider 1) ──
    // `service` here is the live SMSPool service ID returned by
    // getProviderProducts — pass it straight through, no local lookup.
    if (provider === "smspool") {
      const isoCountry = SMSPOOL_ISO_COUNTRY[country.toLowerCase()];
      if (!isoCountry) {
        return res.status(400).json({
          message: "Provider 1 doesn't support this country. Try Provider 2.",
        });
      }
      const response = await axios.post(`${SMSPOOL_API}/purchase/sms`, null, {
        params: {
          key: process.env.SMSPOOL_API_KEY,
          country: isoCountry,
          service,
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
      description: `Virtual number for ${order.service} in ${country} via ${provider}`,
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