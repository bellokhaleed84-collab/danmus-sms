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

const PROVIDER_LABELS = { smspool: "Provider 1", fivesim: "Provider 2", grizzly: "Provider 3" };
const PROVIDER_ORDER = ["smspool", "fivesim", "grizzly"];

// Grizzly has no working service-list action (getServices = BAD_ACTION).
// This is our curated list using standard SMS-Activate-family short codes.
// If a code is wrong, that specific service will fail at buy time — logged.
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
// Each provider returns ITS OWN real country identifiers. The frontend
// stores whatever value comes back here and sends it straight through to
// buy — no translation between provider ID systems, ever.
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
      console.log("SMSPool country/retrieve_all raw:", JSON.stringify(response.data).slice(0, 800));
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
    return res.status(200).json([]); // fail soft — UI just shows "no countries"
  }
};

// ── PROVIDER-SCOPED PRODUCTS/SERVICES ─────────
const getProviderProducts = async (req, res) => {
  const { provider, country } = req.params;
  try {
    const usdToNgn = await getUsdToNgnRate();

    const lockedItems = await ServiceControl.find({ locked: true });
    const lockedKeys = lockedItems.map((item) => item.key.toLowerCase());
    if (lockedKeys.includes(provider)) {
      return res.status(200).json([]); // whole provider locked
    }
    // Combo lock keyed on label (not the provider's own value format) so it
    // works consistently across 5sim/Grizzly slugs and SMSPool's native names.
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
      // No live service catalog available — curated list, checkout pricing.
      const list = Object.keys(GRIZZLY_SERVICES)
        .filter((slug) => notLocked(slug))
        .map((slug) => ({
          value: slug,
          label: slug,
          price: null,
          qty: 1,
        }));
      return res.status(200).json(list);
    }

    if (provider === "smspool") {
      const response = await axios.get(`${SMSPOOL_API}/service/retrieve_all`, {
        params: { key: process.env.SMSPOOL_API_KEY, country },
        timeout: 5000,
      });
      console.log("SMSPool service/retrieve_all raw:", JSON.stringify(response.data).slice(0, 800));
      const data = response.data;
      const arr = Array.isArray(data) ? data : Object.values(data || {});
      const list = arr
        .map((s) => ({
          value: s.ID ?? s.id ?? s.name,
          label: s.name ?? String(s.ID ?? s.id ?? ""),
          price: null, // checkout pricing until confirmed
          qty: 1,
        }))
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
// country/service now arrive already in the chosen provider's own native
// format (picked from that provider's own live list) — no translation.
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
    // Secondary safety net — primary enforcement is at listing time (getProviderProducts),
    // which filters by label and already keeps locked services out of the dropdown.
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
      const response = await axios.post(`${SMSPOOL_API}/purchase/sms`, null, {
        params: { key: process.env.SMSPOOL_API_KEY, country, service },
        timeout: 8000,
      });
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
      await Transaction.findOneAndUpdate({ paymentReference: { $regex: cleanId } }, { otp: code });
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

    const transaction = await Transaction.findOne({ paymentReference: { $regex: cleanId } });
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