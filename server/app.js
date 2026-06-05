const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const walletRoutes = require("./routes/walletRoutes");
const smsRoutes = require("./routes/smsRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const userRoutes = require("./routes/userRoutes");

const app = express();

// ✅ Allow ALL origins
app.use(cors());
app.options(/.*/, cors());

// ✅ Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Health check
app.get("/", (req, res) => {
  res.json({ status: "Backend is running ✅" });
});

// ✅ Routes
app.use("/api/auth", authRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/sms", smsRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/users", userRoutes);

module.exports = app;