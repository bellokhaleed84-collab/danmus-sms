const crypto = require("crypto");
const axios = require("axios");

// Sandbox by default. Set MONNIFY_BASE_URL=https://api.monnify.com for live.
const baseURL = () => (process.env.MONNIFY_BASE_URL || "https://sandbox.monnify.com").replace(/\/+$/, "");

let token = null;
let tokenExpiresAt = 0;

// Monnify tokens last about 1 hour. We cache one and refresh it early.
async function getToken() {
  if (token && Date.now() < tokenExpiresAt) return token;

  const basic = Buffer.from(
    `${process.env.MONNIFY_API_KEY}:${process.env.MONNIFY_SECRET_KEY}`
  ).toString("base64");

  const { data } = await axios.post(
    baseURL() + "/api/v1/auth/login",
    {},
    { headers: { Authorization: `Basic ${basic}` }, timeout: 20000 }
  );

  const t = data && data.responseBody && data.responseBody.accessToken;
  if (!t) throw new Error("Monnify did not return an access token");

  const seconds = Number(data.responseBody.expiresIn) || 3600;
  token = t;
  tokenExpiresAt = Date.now() + Math.max(seconds - 120, 60) * 1000;
  return token;
}

// Authenticated call. If the token was rejected, fetch a new one and retry once.
async function request(method, path, opts) {
  const { data, params } = opts || {};
  for (let attempt = 0; attempt < 2; attempt++) {
    const t = await getToken();
    try {
      const r = await axios({
        method,
        url: baseURL() + path,
        data,
        params,
        timeout: 20000,
        headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
      });
      return r.data;
    } catch (err) {
      if (err.response && err.response.status === 401 && attempt === 0) {
        token = null;
        continue;
      }
      throw err;
    }
  }
}

// amountNaira is a whole number of naira (Monnify takes NGN, not kobo).
async function initializeTransaction({ amountNaira, email, name, reference, description, redirectUrl }) {
  const body = await request("post", "/api/v1/merchant/transactions/init-transaction", {
    data: {
      amount: amountNaira,
      customerName: name || "Customer",
      customerEmail: email,
      paymentReference: reference,
      paymentDescription: description || "Wallet funding",
      currencyCode: "NGN",
      contractCode: process.env.MONNIFY_CONTRACT_CODE,
      redirectUrl,
      paymentMethods: ["CARD", "ACCOUNT_TRANSFER"],
    },
  });
  const checkoutUrl = body && body.responseBody && body.responseBody.checkoutUrl;
  if (!checkoutUrl) throw new Error("Monnify did not return a checkout URL");
  return checkoutUrl;
}

// Looks the transaction up by OUR reference.
// Returns { status, amountKobo, raw }. status is uppercase e.g. "PAID".
async function verifyTransaction(reference) {
  const body = await request("get", "/api/v2/merchant/transactions/query", {
    params: { paymentReference: reference },
  });
  let rb = body && body.responseBody;
  if (Array.isArray(rb)) rb = rb[0];
  rb = rb || {};
  return {
    status: String(rb.paymentStatus || "").toUpperCase(),
    amountKobo: Math.round(Number(rb.amountPaid) * 100),
    raw: body,
  };
}

// Monnify signs the raw body with HMAC-SHA512 (lowercase hex), using your
// Secret Key, and sends it in the "monnify-signature" header.
function isValidWebhookSignature(rawBody, headerValue) {
  const secret = process.env.MONNIFY_SECRET_KEY;
  if (!rawBody || !headerValue || !secret) return false;
  const expected = crypto.createHmac("sha512", secret).update(rawBody).digest("hex");
  const got = String(headerValue).trim().toLowerCase();
  const a = Buffer.from(expected);
  const b = Buffer.from(got);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

module.exports = { initializeTransaction, verifyTransaction, isValidWebhookSignature };