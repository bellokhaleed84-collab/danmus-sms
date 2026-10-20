const express = require("express");
const cors = require("cors");
const session = require("express-session");
const passport = require("./config/passport");

const authRoutes = require("./routes/authRoutes");
const walletRoutes = require("./routes/walletRoutes");
const smsRoutes = require("./routes/smsRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const userRoutes = require("./routes/userRoutes");
const adminRoutes = require("./routes/adminRoutes");
const listingRoutes = require("./routes/listingRoutes");
const boostRoutes = require("./routes/boostRoutes");
const squadRoutes = require("./routes/squadRoutes"); // SQUAD (edit 1)
const { webhook: squadWebhook } = require("./controllers/squadController"); // SQUAD (edit 1)
const { generalLimiter } = require("./middleware/rateLimiter");

const app = express();

// Render sits behind exactly one proxy layer — trust it so express-rate-limit
// (and anything else reading req.ip) sees the real client IP instead of
// throwing the X-Forwarded-For validation warning.
app.set("trust proxy", 1);

// ── CORS — restricted to known origins ────────
const allowedOrigins = [
  "https://danmussms.com",
  "https://www.danmussms.com",
  "https://danmus-sms-ynmz.vercel.app",
  "http://localhost:3000",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS: " + origin));
      }
    },
    credentials: true,
  })
);

app.options(/.*/, cors());

// SQUAD (edit 2): webhook needs the RAW body to verify the signature,
// so it must come BEFORE express.json()
app.post(
  "/api/squad/webhook",
  express.raw({ type: "*/*", limit: "1mb" }),
  squadWebhook
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());

// ── Rate limiting (after CORS so error responses still carry CORS headers) ──
app.use("/api", generalLimiter);

app.get("/", (req, res) => {
  res.json({ status: "Backend is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/sms", smsRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/listings", listingRoutes);
app.use("/api/boost", boostRoutes);
app.use("/api/squad", squadRoutes); // SQUAD (edit 3)

module.exports = app;