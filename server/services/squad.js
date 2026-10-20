const crypto = require("crypto");
const axios = require("axios");

// Sandbox by default. Set SQUAD_BASE_URL=https://api-d.squadco.com for live.
const baseURL = () => process.env.SQUAD_BASE_URL || "https://sandbox-api-d.squadco.com";

const client = () =>
  axios.create({
    baseURL: baseURL(),
    timeout: 20000,
    headers: {
      Authorization: `Bearer ${process.env.SQUAD_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
  });

// amountKobo must be an integer (Squad amounts are in kobo).
async function initializeTransaction({ amountKobo, email, reference, callbackUrl }) {
  const { data } = await client().post("/transaction/initiate", {
    amount: amountKobo,
    email,
    currency: "NGN",
    initiate_type: "inline",
    transaction_ref: reference,
    callback_url: callbackUrl,
  });
  const checkoutUrl = data?.data?.checkout_url;
  if (!checkoutUrl) throw new Error("Squad did not return a checkout URL");
  return checkoutUrl;
}

// Returns { status, amountKobo, raw }. status is lowercase e.g. "success".
async function verifyTransaction(reference) {
  const { data } = await client().get(
    `/transaction/verify/${encodeURIComponent(reference)}`
  );
  const d = data?.data || {};
  return {
    status: String(d.transaction_status || "").toLowerCase(),
    amountKobo: Number(d.transaction_amount),
    raw: data,
  };
}

// Squad signs the webhook: HMAC-SHA512 (uppercase hex) of the body, secret key,
// sent in the x-squad-encrypted-body header. Pass the RAW body buffer.
function isValidWebhookSignature(rawBody, headerValue) {
  if (!rawBody || !headerValue || !process.env.SQUAD_SECRET_KEY) return false;
  const expected = crypto
    .createHmac("sha512", process.env.SQUAD_SECRET_KEY)
    .update(rawBody)
    .digest("hex")
    .toUpperCase();
  const got = String(headerValue).toUpperCase();
  const a = Buffer.from(expected);
  const b = Buffer.from(got);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

module.exports = { initializeTransaction, verifyTransaction, isValidWebhookSignature };
