const User = require("../models/User");
const Transaction = require("../models/Transaction");
const ServiceControl = require("../models/ServiceControl");
const axios = require("axios");

const FIVESIM_API = "https://5sim.net/v1";
const GRIZZLY_API = "https://api.grizzlysms.com/stubs/handler_api.php";
const SMSPOOL_API = "https://api.smspool.net/stubs/handler_api";
const MARKUP = 1.8; // 80% markup, applied uniformly across all three providers

const fivesimHeaders = {
  Authorization: `Bearer ${process.env.FIVESIM_API_KEY}`,
  Accept: "application/json",
};

// ── PROVIDER LABELS (shown to user instead of raw provider names) ──
const PROVIDER_LABELS = {
  smspool: "Provider 1",
  fivesim: "Provider 2",
  grizzly: "Provider 3",
};
const PROVIDER_ORDER = ["smspool", "fivesim", "grizzly"];

// ── SMSPOOL ID MAPPING ────────────────────────
// SMSPool's API needs its own numeric IDs, not slugs like "usa"/"whatsapp".
// Only countries/services listed here can route through SMSPool — anything
// else automatically has no "Provider 1" option in the UI.
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

const SMSPOOL_SERVICE_ID_TO_SLUG = Object.fromEntries(
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

// ── PRODUCTS CACHE (per country) ──────────────
// Querying 3 providers in parallel on every page load is expensive; cache
// briefly so repeated country switches / re-renders don't re-fire all 3.
const productsCache = new Map(); // country -> { data, cachedAt }
const PRODUCTS_CACHE_TTL = 2 * 60 * 1000; // 2 minutes

// ── HELPER: parse SMS-Activate-style plain text response ──
// Used by both Grizzly and SMSPool — they share the same response format.
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

// ── PER-PROVIDER PRICE FETCHERS ────────────────
// Each returns { [serviceSlug]: { price(usd), qty } } or {} on failure/no-match.
// Shared by getProducts (display) and buySMS (server-side price re-validation).

async function getFivesimPrices(country) {
  const response = await axios.get(
    `${FIVESIM_API}/guest/products/${country}/any`,
    { headers: fivesimHeaders, timeout: 5000 }
  );
  const out = {};
  Object.entries(response.data || {}).forEach(([service, data]) => {
    if (data && data.Price != null) {
      out[service] = { price: data.Price, qty: data.Qty ?? 1 };
    }
  });
  return out;
}

async function getGrizzlyPrices(country) {
  const response = await axios.get(GRIZZLY_API, {
    params: {
      api_key: process.env.GRIZZLY_API_KEY,
      action: "getPrices",
      country,
    },
    timeout: 5000,
  });
  const out = {};
  const data = response.data;
  if (data && typeof data === "object") {
    Object.entries(data).forEach(([service, serviceData]) => {
      if (serviceData && typeof serviceData === "object") {
        const operators = Object.values(serviceData);
        if (operators.length > 0) {
          const cheapest = operators.reduce((min, op) =>
            op.cost < min.cost ? op : min
          );
          out[service] = { price: cheapest.cost, qty: cheapest.count || 1 };
        }
      }
    });
  }
  return out;
}

async function getSmspoolPrices(country) {
  // NOTE: action name / response shape assumed to mirror the SMS-Activate-style
  // handler_api.php pattern used elsewhere in this file. Confirm against
  // SMSPool's actual API docs — this is defensive (returns {} on any mismatch
  // or failure) so a wrong assumption just means "Provider 1 shows no price"
  // rather than crashing the request.
  const smspoolCountryId = SMSPOOL_COUNTRY_MAP[country.toLowerCase()];
  if (!smspoolCountryId) return {};

  const response = await axios.get(SMSPOOL_API, {
    params: {
      api_key: process.env.SMSPOOL_API_KEY,
      action: "getPrices",
      country: smspoolCountryId,
      setting: "smspool",
    },
    timeout: 5000,
  });

  const out = {};
  const data = response.data;
  if (data && typeof data === "object") {
    Object.entries(data).forEach(([serviceId, info]) => {
      const slug = SMSPOOL_SERVICE_ID_TO_SLUG[String(serviceId)];
      const rawPrice = info?.price ?? info?.cost;
      if (slug && rawPrice != null) {
        out[slug] = {
          price: Number(rawPrice),
          qty: info.count ?? info.qty ?? 1,
        };
      }
    });
  }
  return out;
}

const PRICE_FETCHERS = {
  smspool: getSmspoolPrices,
  fivesim: getFivesimPrices,
  grizzly: getGrizzlyPrices,
};

// Fetches all three providers in parallel. Never throws — a dead/erroring
// provider just contributes {} instead of failing the whole request.
async function getAllProviderPrices(country) {
  const [smspool, fivesim, grizzly] = await Promise.allSettled([
    getSmspoolPrices(country),
    getFivesimPrices(country),
    getGrizzlyPrices(country),
  ]);
  return {
    smspool: smspool.status === "fulfilled" ? smspool.value : {},
    fivesim: fivesim.status === "fulfilled" ? fivesim.value : {},
    grizzly: grizzly.status === "fulfilled" ? grizzly.value : {},
  };
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

// ── GET PRODUCTS BY COUNTRY ──────────────────
// Returns, per service, a price+availability entry for EACH provider that
// has it (labeled provider 1/2/3 on the frontend). Cached briefly per
// country since this now fires 3 parallel upstream requests.
const getProducts = async (req, res) => {
  try {
    const { country } = req.params;

    const cached = productsCache.get(country);
    if (cached && Date.now() - cached.cachedAt < PRODUCTS_CACHE_TTL) {
      return res.status(200).json(cached.data);
    }

    const usdToNgn = await getUsdToNgnRate();
    const raw = await getAllProviderPrices(country);

    const allServiceKeys = new Set([
      ...Object.keys(raw.smspool),
      ...Object.keys(raw.fivesim),
      ...Object.keys(raw.grizzly),
    ]);

    const merged = {};
    allServiceKeys.forEach((service) => {
      const providers = {};
      PROVIDER_ORDER.forEach((p) => {
        const entry = raw[p][service];
        if (entry && entry.qty > 0) {
          providers[p] = {
            label: PROVIDER_LABELS[p],
            price: Math.ceil(entry.price * usdToNgn * MARKUP),
            qty: entry.qty,
          };
        }
      });
      if (Object.keys(providers).length > 0) {
        merged[service] = { providers };
      }
    });

    productsCache.set(country, { data: merged, cachedAt: Date.now() });
    return res.status(200).json(merged);
  } catch (error) {
    console.error("getProducts failed:", error.message);
    res.status(500).json({ message: "Service temporarily unavailable. Please try again." });
  }
};

// ── BUY NUMBER ─────────────────────────────────
// provider is REQUIRED and is NOT chained to a fallback — an explicit choice
// either succeeds on that provider or returns a clean error. Price is
// re-fetched server-side right before purchase; the client's price is never
// trusted for the balance deduction.
const buySMS = async (req, res) => {
  try {
    const { country, service, provider } = req.body;

    if (!country || !service || !provider) {
      return res.status(400).json({ message: "Country, service and provider are required" });
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

    // ── Re-fetch the live price for THIS provider/country/service ──
    // Authoritative price — req.body.price is never used for the deduction.
    const usdToNgn = await getUsdToNgnRate();
    let priceMap;
    try {
      priceMap = await PRICE_FETCHERS[provider](country);
    } catch (priceError) {
      console.error(`${provider} price re-check failed:`, priceError.message);
      priceMap = {};
    }

    const liveEntry = priceMap[service.toLowerCase()] || priceMap[service];
    if (!liveEntry || liveEntry.qty <= 0) {
      return res.status(400).json({
        message: `${PROVIDER_LABELS[provider]} has no ${service} numbers available right now.`,
      });
    }
    const smsCost = Math.ceil(liveEntry.price * usdToNgn * MARKUP);

    if (user.balance < smsCost) {
      return res.status(400).json({ message: "Insufficient balance" });
    }

    // ── Attempt purchase on the chosen provider ONLY — no silent fallback ──
    let order = null;

    if (provider === "smspool") {
      const smspoolCountryId = SMSPOOL_COUNTRY_MAP[country.toLowerCase()];
      const smspoolServiceId = SMSPOOL_SERVICE_MAP[service.toLowerCase()];
      if (!smspoolCountryId || !smspoolServiceId) {
        return res.status(400).json({
          message: "Provider 1 doesn't support this country/service combination.",
        });
      }
      const response = await axios.get(SMSPOOL_API, {
        params: {
          api_key: process.env.SMSPOOL_API_KEY,
          action: "getNumber",
          service: smspoolServiceId,
          country: smspoolCountryId,
          setting: "smspool",
        },
        timeout: 8000,
      });
      console.log("SMSPool buy response:", response.data);
      const parsed = parseHandlerApiResponse(response.data);
      if (parsed.status !== "ACCESS_NUMBER") {
        return res.status(400).json({ message: "Provider 1 has no numbers available right now." });
      }
      order = { id: parsed.id, phone: parsed.phone, country, service, price: smsCost };
    }

    if (provider === "fivesim") {
      const response = await axios.get(
        `${FIVESIM_API}/user/buy/activation/${country}/any/${service}`,
        { headers: fivesimHeaders, timeout: 8000 }
      );
      const data = response.data;
      console.log("5sim buy response:", data);
      if (
        !data ||
        !data.id ||
        !data.phone ||
        data.phone === "no free phones" ||
        data.phone === "" ||
        data.phone.includes("no free")
      ) {
        return res.status(400).json({ message: "Provider 2 has no numbers available right now." });
      }
      order = {
        id: String(data.id),
        phone: data.phone,
        country: data.country,
        service: data.product,
        price: smsCost,
      };
    }

    if (provider === "grizzly") {
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
        return res.status(400).json({ message: "Provider 3 has no numbers available right now." });
      }
      order = { id: parsed.id, phone: parsed.phone, country, service, price: smsCost };
    }

    // Deduct balance (using the server-verified smsCost, not the client's)
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
      // provider === "fivesim" (or unspecified — assume 5sim for backwards compat)
      try {
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
      } catch (fivesimError) {
        console.log("5sim check failed:", fivesimError.message);
        return res.status(500).json({ message: "Failed to check SMS status." });
      }
    }

    // Save the OTP to the matching transaction so it survives refresh
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
      // provider === "fivesim" (or unspecified — assume 5sim for backwards compat)
      try {
        await axios.get(`${FIVESIM_API}/user/cancel/${cleanId}`, {
          headers: fivesimHeaders,
          timeout: 5000,
        });
      } catch (fivesimError) {
        console.log("5sim cancel failed:", fivesimError.message);
      }
    }

    // Refund user
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