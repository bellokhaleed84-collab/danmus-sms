const User = require("../models/User");
const Transaction = require("../models/Transaction");
const ServiceControl = require("../models/ServiceControl");
const PriceCache = require("../models/PriceCache");
const axios = require("axios");

const FIVESIM_API = "https://5sim.net/v1";
const GRIZZLY_API = "https://api.grizzlysms.com/stubs/handler_api.php";
const SMSPOOL_API = "https://api.smspool.net";
const MARKUP = 1.8;

const fivesimHeaders = {
  Authorization: `Bearer ${process.env.FIVESIM_API_KEY}`,
  Accept: "application/json",
};

const PROVIDER_LABELS = { smspool: "Provider 1", fivesim: "Provider 2", grizzly: "Provider 3" };
const PROVIDER_ORDER = ["smspool", "fivesim", "grizzly"];

// Shown when no real/cached price exists yet for a service — matched by
// service label (case-insensitive). Fill in real numbers per service.
// Anything not listed here falls back to DEFAULT_ESTIMATE_RANGE.
const SERVICE_ESTIMATE_RANGES = {
  whatsapp: { min: 1500, max: 3000 },
  telegram: { min: 500, max: 1200 },
  google: { min: 500, max: 1200 },
  facebook: { min: 500, max: 1500 },
  tiktok: { min: 500, max: 1500 },
  instagram: { min: 500, max: 1500 },
};
const DEFAULT_ESTIMATE_RANGE = { min: 500, max: 2000 };

function getEstimateRange(label) {
  return SERVICE_ESTIMATE_RANGES[label.toLowerCase()] || DEFAULT_ESTIMATE_RANGE;
}

const GRIZZLY_SERVICES = {
  whatsapp: "wa",
  telegram: "tg",
  google: "go",
  facebook: "fb",
  tiktok: "lf",
  instagram: "ig",
};

let cachedRate = null;
let cachedAt = 0;
const ONE_HOUR = 60 * 60 * 1000;

async function getUsdToNgnRate() {
  const now = Date.now();
  if (cachedRate && now - cachedAt < ONE_HOUR) return cachedRate;
  try {
    const response = await axios.get("https://api.frankfurter.dev/v2/latest?base=USD&symbols=NGN");
    cachedRate = response.data.rates.NGN;
    cachedAt = now;
    return cachedRate;
  } catch (error) {
    console.error("Exchange rate fetch failed:", error.message);
    return cachedRate || 1600;
  }
}

function parseHandlerApiResponse(data) {
  if (typeof data !== "string") return { status: "ERROR", raw: data };
  if (data.startsWith("ACCESS_NUMBER:")) {
    const parts = data.split(":");
    return { status: "ACCESS_NUMBER", id: parts[1], phone: parts[2] };
  }
  if (data.startsWith("STATUS_OK:")) return { status: "STATUS_OK", code: data.split(":")[1] };
  if (data.startsWith("STATUS_WAIT_CODE")) return { status: "STATUS_WAIT_CODE" };
  if (data.startsWith("STATUS_CANCEL")) return { status: "STATUS_CANCEL" };
  return { status: data };
}

// ── PROVIDER-SCOPED COUNTRIES ─────────────────
const getProviderCountries = async (req, res) => {
  const { provider } = req.params;
  try {
    if (provider === "fivesim") {
      try {
        const response = await axios.get(`${FIVESIM_API}/guest/countries`, {
          headers: fivesimHeaders,
          timeout: 5000,
        });
        const list = Object.keys(response.data).map((slug) => ({
          value: slug,
          label: response.data[slug].text_en || slug,
        }));
        return res.status(200).json(list);
      } catch {
        return res.status(200).json([
          { value: "usa", label: "United States" },
          { value: "russia", label: "Russia" },
          { value: "nigeria", label: "Nigeria" },
          { value: "kenya", label: "Kenya" },
          { value: "ghana", label: "Ghana" },
          { value: "pakistan", label: "Pakistan" },
          { value: "india", label: "India" },
          { value: "indonesia", label: "Indonesia" },
          { value: "philippines", label: "Philippines" },
          { value: "mexico", label: "Mexico" },
        ]);
      }
    }

    if (provider === "grizzly") {
      const response = await axios.get(GRIZZLY_API, {
        params: { api_key: process.env.GRIZZLY_API_KEY, action: "getCountries" },
        timeout: 5000,
      });
      const countries = response.data;
      if (!countries || typeof countries !== "object") {
        console.log("Grizzly getCountries unexpected:", countries);
        return res.status(200).json([]);
      }
      const list = Object.values(countries)
        .filter((c) => c && c.visible !== 0)
        .map((c) => ({ value: String(c.id), label: c.eng || String(c.id) }));
      return res.status(200).json(list);
    }

    if (provider === "smspool") {
      const response = await axios.get(`${SMSPOOL_API}/country/retrieve_all`, {
        params: { key: process.env.SMSPOOL_API_KEY },
        timeout: 5000,
      });
      const data = response.data;
      const arr = Array.isArray(data) ? data : Object.values(data || {});
      const list = arr
        .map((c) => ({
          value: c.ID ?? c.id ?? c.short_name ?? c.code,
          label: c.name ?? c.country ?? String(c.ID ?? c.id ?? ""),
        }))
        .filter((c) => c.value != null && c.label);
      return res.status(200).json(list);
    }

    return res.status(400).json({ message: "Unknown provider" });
  } catch (error) {
    console.error(`getProviderCountries(${provider}) failed:`, error.message);
    return res.status(200).json([]);
  }
};

// ── PROVIDER-SCOPED PRODUCTS/SERVICES ─────────
// SMSPool/Grizzly show a cached "last real price" when we have one (seeded
// by buySMS after an actual purchase), otherwise "price confirmed at
// checkout". No per-service live-price network calls here — that guessed
// endpoint (/request/price) isn't confirmed to exist and was causing both
// slow loads (extra calls per service, each up to 4s) and missing prices
// (silently failing for everything except cached combos).
const getProviderProducts = async (req, res) => {
  const { provider, country } = req.params;
  try {
    const usdToNgn = await getUsdToNgnRate();

    const lockedItems = await ServiceControl.find({ locked: true });
    const lockedKeys = lockedItems.map((item) => item.key.toLowerCase());
    if (lockedKeys.includes(provider)) {
      return res.status(200).json([]);
    }
    function notLocked(label) {
      const l = label.toLowerCase();
      return !lockedKeys.includes(l) && !lockedKeys.includes(`${provider}:${l}`);
    }

    if (provider === "fivesim") {
      const response = await axios.get(`${FIVESIM_API}/guest/products/${country}/any`, {
        headers: fivesimHeaders,
        timeout: 5000,
      });
      const list = Object.keys(response.data)
        .filter((s) => response.data[s].Qty > 0 && notLocked(s))
        .map((s) => ({
          value: s,
          label: s,
          price: Math.ceil(response.data[s].Price * usdToNgn * MARKUP),
          qty: response.data[s].Qty,
        }));
      return res.status(200).json(list);
    }

    if (provider === "grizzly") {
      const cached = await PriceCache.find({ provider: "grizzly", country }).lean();
      const cacheMap = Object.fromEntries(cached.map((c) => [c.service, c.priceNgn]));
      const list = Object.keys(GRIZZLY_SERVICES)
        .filter((slug) => notLocked(slug))
        .map((slug) => {
          const range = getEstimateRange(slug);
          const cachedPrice = cacheMap[slug] ?? null;
          return {
            value: slug,
            label: slug,
            price: cachedPrice,
            estimateMin: cachedPrice == null ? range.min : null,
            estimateMax: cachedPrice == null ? range.max : null,
            qty: 1,
          };
        });
      return res.status(200).json(list);
    }

    if (provider === "smspool") {
      // Confirmed endpoint per SMSPool's official Postman docs:
      // POST https://api.smspool.net/request/pricing (form-data: key, country)
      // Returns real per-service prices for the given country in one call —
      // no more separate service/retrieve_all guess needed.
      try {
        const form = new URLSearchParams();
        form.append("key", process.env.SMSPOOL_API_KEY);
        form.append("country", country);
        const response = await axios.post(`${SMSPOOL_API}/request/pricing`, form, {
          timeout: 8000,
        });
        const rows = Array.isArray(response.data) ? response.data : [];

        // Multiple pools can offer the same service at different prices —
        // keep the cheapest per service for display.
        const cheapestByService = {};
        for (const row of rows) {
          const usd = Number(row.price);
          if (!Number.isFinite(usd)) continue;
          const existing = cheapestByService[row.service];
          if (!existing || usd < existing.usd) {
            cheapestByService[row.service] = { usd, name: row.service_name };
          }
        }

        const list = Object.entries(cheapestByService)
          .map(([serviceId, { usd, name }]) => ({
            value: serviceId,
            label: name,
            price: Math.ceil(usd * usdToNgn * MARKUP),
            qty: 1,
          }))
          .filter((s) => notLocked(s.label));

        return res.status(200).json(list);
      } catch (error) {
        console.log("SMSPool /request/pricing failed, falling back to cache:", error.message);
      }

      // Fallback only if the live pricing call itself fails (network issue,
      // rate limit, etc.) — still try to show something useful.
      const response = await axios.get(`${SMSPOOL_API}/service/retrieve_all`, {
        params: { key: process.env.SMSPOOL_API_KEY, country },
        timeout: 5000,
      });
      const data = response.data;
      const arr = Array.isArray(data) ? data : Object.values(data || {});

      const cached = await PriceCache.find({ provider: "smspool", country }).lean();
      const cacheMap = Object.fromEntries(cached.map((c) => [c.service, c.priceNgn]));

      const list = arr
        .map((s) => {
          const value = s.ID ?? s.id ?? s.name;
          const label = s.name ?? String(s.ID ?? s.id ?? "");
          const cachedPrice = cacheMap[value] ?? null;
          const range = getEstimateRange(label);
          return {
            value,
            label,
            price: cachedPrice,
            estimateMin: cachedPrice == null ? range.min : null,
            estimateMax: cachedPrice == null ? range.max : null,
            qty: 1,
          };
        })
        .filter((s) => s.value != null && s.label && notLocked(s.label));
      return res.status(200).json(list);
    }

    return res.status(400).json({ message: "Unknown provider" });
  } catch (error) {
    console.error(`getProviderProducts(${provider}, ${country}) failed:`, error.message);
    return res.status(200).json([]);
  }
};

// ── BUY NUMBER ─────────────────────────────────
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
    const comboKey = `${provider}:${service}`.toLowerCase();
    if (lockedKeys.includes(provider) || lockedKeys.includes(comboKey)) {
      return res.status(400).json({
        message: `${service} on ${PROVIDER_LABELS[provider]} is currently unavailable.`,
      });
    }

    const usdToNgn = await getUsdToNgnRate();
    let order = null;
    let smsCost = null;

    if (provider === "smspool") {
      const form = new URLSearchParams();
      form.append("key", process.env.SMSPOOL_API_KEY);
      form.append("country", country);
      form.append("service", service);
      const response = await axios.post(`${SMSPOOL_API}/purchase/sms`, form, { timeout: 8000 });
      console.log("SMSPool buy response:", response.data);
      const data = response.data;
      if (!data || data.success !== 1 || !data.order_id || !data.phonenumber) {
        const reason =
          data?.message?.includes("whitelist-only")
            ? "This service isn't enabled on Provider 1 yet. Try another provider."
            : data?.errors?.[0]?.message || "Provider 1 could not fulfil this order right now.";
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
      PriceCache.findOneAndUpdate(
        { provider: "smspool", country, service },
        { priceNgn: smsCost },
        { upsert: true }
      ).catch((e) => console.log("PriceCache save failed:", e.message));
    }

    if (provider === "fivesim") {
      const response = await axios.get(`${FIVESIM_API}/user/buy/activation/${country}/any/${service}`, {
        headers: fivesimHeaders,
        timeout: 8000,
      });
      const data = response.data;
      console.log("5sim buy response:", data);
      if (!data?.id || !data?.phone || data.phone === "" || data.phone.includes("no free")) {
        return res.status(400).json({ message: "Provider 2 has no numbers available right now." });
      }
      smsCost = Math.ceil(Number(data.price) * usdToNgn * MARKUP);
      order = { id: String(data.id), phone: data.phone, country: data.country, service: data.product, price: smsCost };
    }

    if (provider === "grizzly") {
      const code = GRIZZLY_SERVICES[service.toLowerCase()] || service;

      let balanceBefore = null;
      try {
        const balResp = await axios.get(GRIZZLY_API, {
          params: { api_key: process.env.GRIZZLY_API_KEY, action: "getBalance" },
          timeout: 5000,
        });
        const match = String(balResp.data).match(/ACCESS_BALANCE:([\d.]+)/);
        balanceBefore = match ? Number(match[1]) : null;
      } catch (e) {
        console.log("Grizzly getBalance (before) failed:", e.message);
      }

      const response = await axios.get(GRIZZLY_API, {
        params: { api_key: process.env.GRIZZLY_API_KEY, action: "getNumber", service: code, country },
        timeout: 8000,
      });
      console.log(`Grizzly buy response (country=${country}, service=${code}):`, response.data);
      const parsed = parseHandlerApiResponse(response.data);
      if (parsed.status !== "ACCESS_NUMBER") {
        return res.status(400).json({ message: "Provider 3 has no numbers available right now for this selection." });
      }

      let grizzlyUsdCost = null;
      if (balanceBefore != null) {
        try {
          const balResp2 = await axios.get(GRIZZLY_API, {
            params: { api_key: process.env.GRIZZLY_API_KEY, action: "getBalance" },
            timeout: 5000,
          });
          const match2 = String(balResp2.data).match(/ACCESS_BALANCE:([\d.]+)/);
          const balanceAfter = match2 ? Number(match2[1]) : null;
          if (balanceAfter != null) {
            const diff = balanceBefore - balanceAfter;
            if (diff > 0) grizzlyUsdCost = diff;
          }
        } catch (e) {
          console.log("Grizzly getBalance (after) failed:", e.message);
        }
      }

      if (grizzlyUsdCost == null) {
        await axios
          .get(GRIZZLY_API, { params: { api_key: process.env.GRIZZLY_API_KEY, action: "setStatus", id: parsed.id, status: 8 } })
          .catch(() => {});
        return res.status(500).json({ message: "Could not confirm price for Provider 3. Please try again." });
      }
      smsCost = Math.ceil(grizzlyUsdCost * usdToNgn * MARKUP);
      order = { id: parsed.id, phone: parsed.phone, country, service, price: smsCost };
      PriceCache.findOneAndUpdate(
        { provider: "grizzly", country, service },
        { priceNgn: smsCost },
        { upsert: true }
      ).catch((e) => console.log("PriceCache save failed:", e.message));
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
      description: `Virtual number for ${service} in ${country}`,
      paymentReference: `${provider}:${order.id}`,
      phone: order.phone,
      country: order.country,
      service: order.service,
    });

    res.status(200).json({ message: "Number purchased successfully", balance: user.balance, provider, order });
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
    const cleanId = orderId.replace("grizzly:", "").replace("5sim:", "").replace("fivesim:", "").replace("smspool:", "");
    let code = null;

    if (provider === "smspool") {
      const response = await axios.post(`${SMSPOOL_API}/sms/check`, null, {
        params: { key: process.env.SMSPOOL_API_KEY, orderid: cleanId },
        timeout: 8000,
      });
      const data = response.data;
      if (data?.status === 3 && data.sms) code = data.sms;
      else return res.status(200).json({ sms: [], status: data?.status ?? "PENDING" });
    } else if (provider === "grizzly") {
      const response = await axios.get(GRIZZLY_API, {
        params: { api_key: process.env.GRIZZLY_API_KEY, action: "getStatus", id: cleanId },
      });
      const parsed = parseHandlerApiResponse(response.data);
      if (parsed.status === "STATUS_OK") code = parsed.code;
      else return res.status(200).json({ sms: [], status: parsed.status });
    } else {
      const response = await axios.get(`${FIVESIM_API}/user/check/${cleanId}`, { headers: fivesimHeaders, timeout: 5000 });
      const sms = response.data.sms || [];
      if (sms.length > 0) code = sms[0].code;
      else return res.status(200).json(response.data);
    }

    if (code) {
      const exactRef = `${provider}:${cleanId}`;
      await Transaction.findOneAndUpdate({ paymentReference: exactRef }, { otp: code });
    }
    return res.status(200).json({ sms: [{ code, text: `Your OTP code: ${code}` }] });
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
    const cleanId = orderId.replace("grizzly:", "").replace("5sim:", "").replace("fivesim:", "").replace("smspool:", "");

    if (provider === "smspool") {
      await axios.post(`${SMSPOOL_API}/sms/cancel`, null, {
        params: { key: process.env.SMSPOOL_API_KEY, orderid: cleanId },
        timeout: 8000,
      });
    } else if (provider === "grizzly") {
      await axios.get(GRIZZLY_API, {
        params: { api_key: process.env.GRIZZLY_API_KEY, action: "setStatus", id: cleanId, status: 8 },
      });
    } else {
      try {
        await axios.get(`${FIVESIM_API}/user/cancel/${cleanId}`, { headers: fivesimHeaders, timeout: 5000 });
      } catch (e) {
        console.log("5sim cancel failed:", e.message);
      }
    }

    const exactRef = `${provider}:${cleanId}`;
    const transaction = await Transaction.findOneAndUpdate(
      { paymentReference: exactRef, refunded: false },
      { refunded: true },
      { new: true }
    );

    if (transaction) {
      const user = await User.findById(transaction.user);
      if (user) {
        user.balance += transaction.amount;
        await user.save();
        return res.status(200).json({ message: "Order cancelled and balance refunded", balance: user.balance });
      }
    }
    res.status(200).json({ message: "Order cancelled successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getSmsHistory = async (req, res) => {
  try {
    const transactions = await Transaction.find({ user: req.user._id, type: "sms_purchase" }).sort({ createdAt: -1 });
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