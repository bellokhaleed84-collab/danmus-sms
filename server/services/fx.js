const axios = require("axios");

let cachedRate = null;
let cachedAt = 0;
const ONE_HOUR = 60 * 60 * 1000;

async function getUsdToNgnRate() {
  const now = Date.now();
  if (cachedRate && now - cachedAt < ONE_HOUR) return cachedRate;
  try {
    const response = await axios.get("https://api.frankfurter.dev/v2/latest?base=USD&symbols=NGN", {
      timeout: 5000,
    });
    cachedRate = response.data.rates.NGN;
    cachedAt = now;
    return cachedRate;
  } catch (error) {
    console.error("Exchange rate fetch failed:", error.message);
    return cachedRate || 1600;
  }
}

module.exports = { getUsdToNgnRate };