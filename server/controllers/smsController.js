const User = require("../models/User");
const Transaction = require("../models/Transaction");
const axios = require("axios");

const FIVESIM_API = "https://5sim.net/v1";
const MARKUP = 1.8;

const fivesimHeaders = {
  Authorization: `Bearer ${process.env.FIVESIM_API_KEY}`,
  Accept: "application/json",
};

// ── EXCHANGE RATE CACHE (refresh every hour) ──
let cachedRate = null;
let cachedAt = 0;
const ONE_HOUR = 60 * 60 * 1000;

async function getUsdToNgnRate() {
  const now = Date.now();
  if (cachedRate && now - cachedAt < ONE_HOUR) {
    return cachedRate;
  }
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

// ── GET COUNTRIES ─────────────────────────────
const getCountries = async (req, res) => {
  try {
    const response = await axios.get(`${FIVESIM_API}/guest/countries`, {
      headers: fivesimHeaders,
    });
    res.status(200).json(response.data);
  } catch (error) {
    res.status(500).json({
      message: error?.response?.data?.message || error.message,
    });
  }
};

// ── GET PRODUCTS BY COUNTRY ──────────────────
const getProducts = async (req, res) => {
  try {
    const { country } = req.params;
    const response = await axios.get(
      `${FIVESIM_API}/guest/products/${country}/any`,
      { headers: fivesimHeaders }
    );
    const usdToNgn = await getUsdToNgnRate();
    const products = response.data;
    const marked = {};
    Object.keys(products).forEach((service) => {
      const usdPrice = products[service].Price;
      const ngnPrice = usdPrice * usdToNgn * MARKUP;
      marked[service] = {
        ...products[service],
        Price: Math.ceil(ngnPrice),
      };
    });
    res.status(200).json(marked);
  } catch (error) {
    res.status(500).json({
      message: error?.response?.data?.message || error.message,
    });
  }
};

// ── BUY NUMBER ─────────────────────────────────
const buySMS = async (req, res) => {
  try {
    const { country, service, price } = req.body;

    if (!country || !service || !price) {
      return res.status(400).json({
        message: "Country, service and price are required",
      });
    }

    const user = await User.findById(req.user._id);
    const smsCost = Number(price);

    if (user.balance < smsCost) {
      return res.status(400).json({
        message: "Insufficient balance",
      });
    }

    // Buy number from 5sim
    const fivesimResponse = await axios.get(
      `${FIVESIM_API}/user/buy/activation/${country}/any/${service}`,
      { headers: fivesimHeaders }
    );

    const order = fivesimResponse.data;

    // LOG RAW RESPONSE TO SEE EXACT FIELD NAMES
    console.log("====== 5SIM RAW ORDER RESPONSE ======");
    console.log(JSON.stringify(order, null, 2));
    console.log("=====================================");

    // Deduct balance
    user.balance -= smsCost;
    await user.save();

    // Save transaction
    await Transaction.create({
      user: user._id,
      type: "sms_purchase",
      amount: smsCost,
      status: "successful",
      description: `Virtual number for ${service} in ${country}`,
      paymentReference: String(order.id),
    });

    res.status(200).json({
      message: "Number purchased successfully",
      balance: user.balance,
      order: {
        id: order.id,
        phone: order.phone,
        country: order.country,
        service: order.product,
        operator: order.operator,
        price: smsCost,
      },
    });
  } catch (error) {
    console.error("5sim buy error:", error?.response?.data || error.message);
    res.status(500).json({
      message: error?.response?.data?.message || error.message,
    });
  }
};

// ── CHECK SMS ──────────────────────────────────
const checkSMS = async (req, res) => {
  try {
    const { orderId } = req.params;

    console.log("====== CHECK SMS ORDER ID ======");
    console.log(orderId);
    console.log("================================");

    if (!orderId || orderId === "undefined") {
      return res.status(400).json({
        message: "Invalid order ID",
      });
    }

    const response = await axios.get(
      `${FIVESIM_API}/user/check/${orderId}`,
      { headers: fivesimHeaders }
    );

    console.log("====== 5SIM CHECK RESPONSE ======");
    console.log(JSON.stringify(response.data, null, 2));
    console.log("=================================");

    res.status(200).json(response.data);
  } catch (error) {
    console.error("5sim check error:", error?.response?.data || error.message);
    res.status(500).json({
      message: error?.response?.data?.message || error.message,
    });
  }
};

// ── CANCEL ORDER ───────────────────────────────
const cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    await axios.get(
      `${FIVESIM_API}/user/cancel/${orderId}`,
      { headers: fivesimHeaders }
    );

    res.status(200).json({
      message: "Order cancelled successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: error?.response?.data?.message || error.message,
    });
  }
};

module.exports = {
  getCountries,
  getProducts,
  buySMS,
  checkSMS,
  cancelOrder,
};