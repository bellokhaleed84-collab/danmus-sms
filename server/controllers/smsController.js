const User = require("../models/User");
const Transaction = require("../models/Transaction");
const axios = require("axios");

const FIVESIM_API = "https://5sim.net/v1";
const GRIZZLY_API = "https://api.grizzlysms.com/stubs/handler_api.php";
const MARKUP = 1.8;

const fivesimHeaders = {
  Authorization: `Bearer ${process.env.FIVESIM_API_KEY}`,
  Accept: "application/json",
};

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

// ── HELPER: parse Grizzly plain text response ──
function parseGrizzlyResponse(data) {
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
    // Try 5sim first
    const response = await axios.get(`${FIVESIM_API}/guest/countries`, {
      headers: fivesimHeaders,
      timeout: 5000,
    });
    return res.status(200).json(response.data);
  } catch (error) {
    console.log("5sim countries failed, using static list");
    // Fallback static country list
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
const getProducts = async (req, res) => {
  try {
    const { country } = req.params;
    const usdToNgn = await getUsdToNgnRate();

    // Try 5sim first
    try {
      const response = await axios.get(
        `${FIVESIM_API}/guest/products/${country}/any`,
        { headers: fivesimHeaders, timeout: 5000 }
      );
      const products = response.data;
      const marked = {};
      Object.keys(products).forEach((service) => {
        const usdPrice = products[service].Price;
        const ngnPrice = usdPrice * usdToNgn * MARKUP;
        marked[service] = {
          ...products[service],
          Price: Math.ceil(ngnPrice),
          provider: "5sim",
        };
      });
      console.log("Products fetched from 5sim ✅");
      return res.status(200).json(marked);
    } catch (fivesimError) {
      console.log("5sim products failed, trying Grizzly SMS...");
    }

    // Fallback to Grizzly SMS
    const response = await axios.get(GRIZZLY_API, {
      params: {
        api_key: process.env.GRIZZLY_API_KEY,
        action: "getPrices",
        country: country,
      },
      timeout: 5000,
    });

    const data = response.data;
    const marked = {};

    if (data && typeof data === "object") {
      Object.keys(data).forEach((service) => {
        const serviceData = data[service];
        if (serviceData && typeof serviceData === "object") {
          const operators = Object.values(serviceData);
          if (operators.length > 0) {
            const cheapest = operators.reduce((min, op) =>
              op.cost < min.cost ? op : min
            );
            const ngnPrice = cheapest.cost * usdToNgn * MARKUP;
            marked[service] = {
              Price: Math.ceil(ngnPrice),
              Qty: cheapest.count || 1,
              provider: "grizzly",
            };
          }
        }
      });
    }

    console.log("Products fetched from Grizzly SMS ✅");
    return res.status(200).json(marked);

  } catch (error) {
    console.error("Both providers failed for products:", error.message);
    res.status(500).json({ message: "Service temporarily unavailable. Please try again." });
  }
};

// ── BUY NUMBER ─────────────────────────────────
const buySMS = async (req, res) => {
  try {
    const { country, service, price, provider } = req.body;

    if (!country || !service || !price) {
      return res.status(400).json({
        message: "Country, service and price are required",
      });
    }

    const user = await User.findById(req.user._id);
    const smsCost = Number(price);

    if (user.balance < smsCost) {
      return res.status(400).json({ message: "Insufficient balance" });
    }

    let order = null;
    let usedProvider = null;

    // Try 5sim first (unless product was from Grizzly)
    if (provider !== "grizzly") {
      try {
        const fivesimResponse = await axios.get(
          `${FIVESIM_API}/user/buy/activation/${country}/any/${service}`,
          { headers: fivesimHeaders, timeout: 8000 }
        );
        const data = fivesimResponse.data;
        console.log("5sim buy success ✅", data);
        order = {
          id: String(data.id),
          phone: data.phone,
          country: data.country,
          service: data.product,
          price: smsCost,
        };
        usedProvider = "5sim";
      } catch (fivesimError) {
        console.log("5sim buy failed, trying Grizzly SMS...");
      }
    }

    // Fallback to Grizzly SMS
    if (!order) {
      const grizzlyResponse = await axios.get(GRIZZLY_API, {
        params: {
          api_key: process.env.GRIZZLY_API_KEY,
          action: "getNumber",
          service: service,
          country: country,
        },
        timeout: 8000,
      });

      console.log("Grizzly buy response:", grizzlyResponse.data);
      const parsed = parseGrizzlyResponse(grizzlyResponse.data);

      if (parsed.status !== "ACCESS_NUMBER") {
        return res.status(400).json({
          message: `Failed to get number: ${parsed.status}`,
        });
      }

      order = {
        id: parsed.id,
        phone: parsed.phone,
        country: country,
        service: service,
        price: smsCost,
      };
      usedProvider = "grizzly";
    }

    // Deduct balance
    user.balance -= smsCost;
    await user.save();

    // Save transaction
    await Transaction.create({
      user: user._id,
      type: "sms_purchase",
      amount: smsCost,
      status: "successful",
      description: `Virtual number for ${service} in ${country} via ${usedProvider}`,
      paymentReference: `${usedProvider}:${order.id}`,
    });

    res.status(200).json({
      message: "Number purchased successfully",
      balance: user.balance,
      provider: usedProvider,
      order,
    });

  } catch (error) {
    console.error("Both providers failed for buy:", error?.response?.data || error.message);
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

    // Determine provider from paymentReference prefix or query param
    const useGrizzly = provider === "grizzly" || orderId.startsWith("grizzly:");
    const cleanId = orderId.replace("grizzly:", "").replace("5sim:", "");

    if (useGrizzly) {
      const response = await axios.get(GRIZZLY_API, {
        params: {
          api_key: process.env.GRIZZLY_API_KEY,
          action: "getStatus",
          id: cleanId,
        },
      });

      console.log("Grizzly check response:", response.data);
      const parsed = parseGrizzlyResponse(response.data);

      if (parsed.status === "STATUS_OK") {
        return res.status(200).json({
          sms: [{ code: parsed.code, text: `Your OTP code: ${parsed.code}` }],
        });
      }
      return res.status(200).json({ sms: [], status: parsed.status });
    }

    // Default: try 5sim
    try {
      const response = await axios.get(
        `${FIVESIM_API}/user/check/${cleanId}`,
        { headers: fivesimHeaders, timeout: 5000 }
      );
      console.log("5sim check response:", response.data);
      return res.status(200).json(response.data);
    } catch (fivesimError) {
      console.log("5sim check failed, trying Grizzly...");
      const response = await axios.get(GRIZZLY_API, {
        params: {
          api_key: process.env.GRIZZLY_API_KEY,
          action: "getStatus",
          id: cleanId,
        },
      });
      const parsed = parseGrizzlyResponse(response.data);
      if (parsed.status === "STATUS_OK") {
        return res.status(200).json({
          sms: [{ code: parsed.code, text: `Your OTP code: ${parsed.code}` }],
        });
      }
      return res.status(200).json({ sms: [], status: parsed.status });
    }

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

    const useGrizzly = provider === "grizzly" || orderId.startsWith("grizzly:");
    const cleanId = orderId.replace("grizzly:", "").replace("5sim:", "");

    if (useGrizzly) {
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
        await axios.get(
          `${FIVESIM_API}/user/cancel/${cleanId}`,
          { headers: fivesimHeaders, timeout: 5000 }
        );
      } catch {
        await axios.get(GRIZZLY_API, {
          params: {
            api_key: process.env.GRIZZLY_API_KEY,
            action: "setStatus",
            id: cleanId,
            status: 8,
          },
        });
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

module.exports = {
  getCountries,
  getProducts,
  buySMS,
  checkSMS,
  cancelOrder,
};