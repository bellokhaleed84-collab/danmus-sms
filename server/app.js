const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const walletRoutes = require("./routes/walletRoutes");
const smsRoutes = require("./routes/smsRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const userRoutes = require("./routes/userRoutes");

const app = express();

// Middleware
const cors = require("cors");

app.use(cors({
  origin: "https://danmus-sms-1.onrender.com",
  credentials: true
}));

app.options("*", cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/sms", smsRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/users", userRoutes);

// Main Route
app.get("/", (req, res) => {
  res.send("Backend is running...");
});

module.exports = app;