const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const walletRoutes = require("./routes/walletRoutes");
const smsRoutes = require("./routes/smsRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const userRoutes = require("./routes/userRoutes");

const app = express();

// ✅ CORS config
app.use(
  cors({
    origin: function (origin, callback) {
      const allowedOrigins = [
        "https://danmus-sms-production.up.railway.app", // Railway backend
        "https://danmus-sms-ynmz.vercel.app/",     // Railway frontend (update after deploy)
        "http://localhost:3000",                         // Local dev
      ];
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS: " + origin));
      }
    },
    credentials: true,
  })
);

// ✅ Preflight fix
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