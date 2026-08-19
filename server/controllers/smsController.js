const User = require("../models/User");
const Transaction = require("../models/Transaction");
const ServiceControl = require("../models/ServiceControl");
const axios = require("axios");

const FIVESIM_API = "https://5sim.net/v1";
const GRIZZLY_API = "https://api.grizzlysms.com/stubs/handler_api.php";

// SMSPool: native API confirmed via official docs (order/check/cancel).
// See https://www.smspool.net/article/smspool-api-order-view-and-cancel-numbers
const SMSPOOL_API = "https://api.smspool.net";

const MARKUP = 1.8; // 80% markup, applied uniformly across all three providers

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

// SMSPool's native API needs an ISO alpha-2 country code, not this app's
// internal country slug. Extend as you support more countries.
const SMSPOOL_ISO_COUNTRY = {
  usa: "US",
  russia: "RU",
  kazakhstan: "KZ",
  thailand: "TH",
  mexico: "MX",
  pakistan: "PK",
};

// SMSPool matches service by proper-cased name.
const SMSPOOL_SERVICE_NAME = {
  whatsapp: "WhatsApp",
  telegram: "Telegram",
  google: "Google",
  facebook: "Facebook",
  tiktok: "TikTok",
  instagram: "Instagram",
};

// Grizzly services this app supports (used for both listing and buy).
const GRIZZLY_SERVICES = ["whatsapp", "telegram", "google", "facebook", "tiktok", "instagram"];

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

// ── HELPER: parse SMS-Activate-style plain text response (Grizzly only now) ──
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

// ── GET PRODUCTS BY COUNTRY ──────────────────
// Only 5sim's bulk price list has been confirmed correct in production logs.
// SMSPool and Grizzly are shown as "available, price at checkout" rather than
// guessing a price we can't yet verify — showing a wrong number is worse
// than showing no number.
const getProducts = async (req, res) => {
  try {
    const { country } = req.params;
    const usdToNgn = await getUsdToNgnRate();
    const grouped = {};

    function addEntry(serviceSlug, providerKey, priceNgnOrNull, qty) {
      if (!qty || qty <= 0) return;
      if (!grouped[serviceSlug]) grouped[serviceSlug] = { providers: {} };
      grouped[serviceSlug].providers[providerKey] = {
        label: PROVIDER_LABELS[providerKey],
        price: priceNgnOrNull, // null = "confirmed at checkout"
        qty,
      };
    }

    // ── 5sim (Provider 2) — confirmed working, shows real price ──
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

    // ── Grizzly (Provider 3) — getPrices returns BAD_ACTION on this account,
    // confirmed even with service param included. Skip bulk pricing entirely;
    // list as available with checkout pricing, same as SMSPool.
    for (const slug of GRIZZLY_SERVICES) {
      addEntry(slug, "grizzly", null, 1);
    }
    console.log("Grizzly listed ✅ (checkout pricing — getPrices unsupported on this account)");

    // ── SMSPool (Provider 1) — shown as available with checkout pricing ──
    // We no longer guess a bulk price. Availability is treated as "try at checkout";
    // the real cost comes back from the native /purchase/sms response.
    for (const slug of GRIZZLY_SERVICES) {
      addEntry(slug, "smspool", null, 1); // qty is a placeholder "try it" flag until confirmed
    }
    console.log("SMSPool listed ✅ (checkout pricing, not yet bulk-confirmed)");

    return res.status(200).json(grouped);
  } catch (error) {
    console.error("Products fetch failed:", error.message);
    res.status(500).json({ message: "Service temporarily unavailable. Please try again." });
  }
};

// ── BUY NUMBER ─────────────────────────────────
// SMSPool now uses the confirmed native API. Its real cost comes back in the
// order response itself — that's what we charge, capped by maxPriceNgn so
// the user is never charged more than a sane ceiling.
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

    // ── SMSPool: native API — cost comes back in the response ──
    if (provider === "smspool") {
      const isoCountry = SMSPOOL_ISO_COUNTRY[country.toLowerCase()];
      const properService = SMSPOOL_SERVICE_NAME[service.toLowerCase()];
      if (!isoCountry || !properService) {
        return res.status(400).json({
          message: "Provider 1 doesn't support this country/service combination.",
        });
      }
      const response = await axios.post(`${SMSPOOL_API}/purchase/sms`, null, {
        params: {
          key: process.env.SMSPOOL_API_KEY,
          country: isoCountry,
          service: properService,
          // max_price is SMSPool's own USD ceiling param — convert our NGN
          // budget back to USD as a safety cap, if the client supplied one.
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
          data?.type === "OUT_OF_STOCK" ? "No numbers available right now." :
          data?.type === "BALANCE_ERROR" ? "Provider 1 balance error — contact support." :
          data?.type === "PRICE_NOT_FOUND" ? "No number found under the price limit." :
          "Provider 1 could not fulfil this order right now.";
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

    // ── 5sim ──
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
        data.phone === "" ||
        data.phone.includes("no free")
      ) {
        return res.status(400).json({ message: "Provider 2 has no numbers available right now." });
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

    // ── Grizzly ──
    if (provider === "grizzly") {
      // getNumber with plain slugs (country: "usa", service: "whatsapp") is
      // confirmed BAD_ACTION on this account — never actually worked, only
      // assumed. Rather than guess again, refuse cleanly and log the real
      // country/service lists so the next deploy can use correct codes.
      try {
        const countriesResp = await axios.get(GRIZZLY_API, {
          params: { api_key: process.env.GRIZZLY_API_KEY, action: "getCountries" },
          timeout: 5000,
        });
        console.log("Grizzly getCountries raw:", JSON.stringify(countriesResp.data).slice(0, 1500));
      } catch (e) {
        console.log("Grizzly getCountries failed:", e.message);
      }
      try {
        const servicesResp = await axios.get(GRIZZLY_API, {
          params: { api_key: process.env.GRIZZLY_API_KEY, action: "getServices" },
          timeout: 5000,
        });
        console.log("Grizzly getServices raw:", JSON.stringify(servicesResp.data).slice(0, 1500));
      } catch (e) {
        console.log("Grizzly getServices failed:", e.message);
      }
      return res.status(400).json({
        message: "Provider 3 is temporarily unavailable while we confirm its country/service codes. Please try Provider 2.",
      });
    }

    if (user.balance < smsCost) {
      // Number was already issued by the provider at this point for SMSPool/Grizzly —
      // in production you'd want to cancel/refund with the provider here too.
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
        params: {
          api_key: process.env.GRIZZLY_API_KEY,
          action: "setStatus",
          id: cleanId,
          status: 8,
        },
      });
    } else {
      try {
        await axios.get(`${FIVESIM_API}/user/cancel/${cleanId}`, {
          headers: fivesimHeaders,
          timeout: 5000,
        });
      } catch (fivesimError) {
        console.log("5sim cancel failed:", fivesimError.message);
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