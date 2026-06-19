const User = require("../models/User");
const Transaction = require("../models/Transaction");
const axios = require("axios");

const FIVESIM_API = "https://5sim.net/v1";
const MARKUP = 1.5; // 50% markup

// ── GET COUNTRIES ─────────────────────────────
const getCountries = async (req, res) => {
  try {
    const response = await axios.get(`${FIVESIM_API}/guest/countries`, {
      headers: {
        Authorization: `Bearer ${process.env.FIVESIM_API_KEY}`,
        Accept: "application/json",
      },
    });

    res.status(200).json(response.data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── GET PRODUCTS BY COUNTRY AND SERVICE ───────
const getProducts = async (req, res) => {
  try {
    const { country, service } = req.params;

    const response = await axios.get(
      `${FIVESIM_API}/guest/products/${country}/${service}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.FIVESIM_API_KEY}`,
          Accept: "application/json",
        },
      }
    );

    // Add 50% markup to all prices
    const products = response.data;
    const marked = {};

    Object.keys(products).forEach((operator) => {
      marked[operator] = {
        ...products[operator],
        Price: +(products[operator].Price * MARKUP).toFixed(2),
      };
    });

    res.status(200).json(marked);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── GET SERVICES BY COUNTRY ───────────────────
const getServices = async (req, res) => {
  try {
    const { country } = req.params;

    const response = await axios.get(
      `${FIVESIM_API}/guest/products/${country}/any`,
      {
        headers: {
          Authorization: `Bearer ${process.env.FIVESIM_API_KEY}`,
          Accept: "application/json",
        },
      }
    );

    res.status(200).json(response.data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── BUY NUMBER ────────────────────────────────
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

    // Check user balance
    if (user.balance < smsCost) {
      return res.status(400).json({
        message: "Insufficient balance",
      });
    }

    // Buy number from 5sim
    const fivesimResponse = await axios.get(
      `${FIVESIM_API}/user/buy/activation/${country}/any/${service}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.FIVESIM_API_KEY}`,
          Accept: "application/json",
        },
      }
    );

    const order = fivesimResponse.data;

    // Deduct balance
    user.balance -= smsCost;
    await user.save();

    // Save transaction
    const transaction = await Transaction.create({
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
        price: smsCost,
      },
      transaction,
    });
  } catch (error) {
    console.error("5sim error:", error?.response?.data || error.message);
    res.status(500).json({ message: error.message });
  }
};

// ── CHECK SMS ─────────────────────────────────
const checkSMS = async (req, res) => {
  try {
    const { orderId } = req.params;

    const response = await axios.get(
      `${FIVESIM_API}/user/check/${orderId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.FIVESIM_API_KEY}`,
          Accept: "application/json",
        },
      }
    );

    res.status(200).json(response.data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── CANCEL ORDER ──────────────────────────────
const cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    const response = await axios.get(
      `${FIVESIM_API}/user/cancel/${orderId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.FIVESIM_API_KEY}`,
          Accept: "application/json",
        },
      }
    );

    // Refund user
    const user = await User.findById(req.user._id);
    const transaction = await Transaction.findOne({
      paymentReference: String(orderId),
    });

    if (transaction) {
      user.balance += transaction.amount;
      await user.save();
    }

    res.status(200).json({
      message: "Order cancelled and balance refunded",
      balance: user.balance,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getCountries,
  getServices,
  getProducts,
  buySMS,
  checkSMS,
  cancelOrder,
};