import cors from "cors";
import express from "express";

const app = express();

app.use(cors({
  origin: "https://danmus-sms-1.onrender.com",
  credentials: true
}));

app.use(express.json());
require("dotenv").config();

const app = require("./app");
const connectDB = require("./config/db");

// Connect Database
connectDB();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});