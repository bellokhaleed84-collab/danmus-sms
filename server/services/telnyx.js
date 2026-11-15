const crypto = require("crypto");
const axios = require("axios");

const BASE = "https://api.telnyx.com/v2";

// DER prefix that wraps a raw 32-byte Ed25519 public key into SPKI format
const ED25519_SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");

function isConfigured() {
  return !!process.env.TELNYX_API_KEY;
}

function api() {
  return axios.create({
    baseURL: BASE,
    timeout: 20000,
    headers: {
      Authorization: "Bearer " + process.env.TELNYX_API_KEY,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  });
}

// Pulls a readable message out of a Telnyx error response.
function errorMessage(err) {
  const e = err && err.response && err.response.data && err.response.data.errors;
  if (Array.isArray(e) && e.length) return e[0].detail || e[0].title || "Telnyx error";
  return (err && err.message) || "Telnyx error";
}

// Lists available numbers that support SMS.
async function searchAvailable({ country, type, startsWith, limit }) {
  const p = new URLSearchParams();
  p.append("filter[country_code]", country);
  p.append("filter[features][]", "sms");
  p.append("filter[limit]", String(limit || 20));
  if (type) p.append("filter[phone_number_type]", type);
  if (startsWith) p.append("filter[phone_number][starts_with]", startsWith);
  const { data } = await api().get("/available_phone_numbers", { params: p });
  return Array.isArray(data.data) ? data.data : [];
}

// Places the order. Throws with err.response set if Telnyx clearly rejected it,
// and without err.response on network/timeout (outcome unknown).
async function orderNumber(e164) {
  const body = { phone_numbers: [{ phone_number: e164 }] };
  if (process.env.TELNYX_MESSAGING_PROFILE_ID) body.messaging_profile_id = process.env.TELNYX_MESSAGING_PROFILE_ID;
  if (process.env.TELNYX_CONNECTION_ID) body.connection_id = process.env.TELNYX_CONNECTION_ID;
  const { data } = await api().post("/number_orders", body);
  return { orderId: data.data.id, status: data.data.status };
}

async function getOrder(orderId) {
  const { data } = await api().get("/number_orders/" + encodeURIComponent(orderId));
  return { status: data.data.status, raw: data.data };
}

// Finds the id of a number we own (needed to release it later).
async function findNumberId(e164) {
  const p = new URLSearchParams();
  p.append("filter[phone_number]", e164);
  const { data } = await api().get("/phone_numbers", { params: p });
  const first = Array.isArray(data.data) ? data.data[0] : null;
  return first ? first.id : null;
}

async function releaseNumber(telnyxNumberId) {
  await api().delete("/phone_numbers/" + encodeURIComponent(telnyxNumberId));
}

// Telnyx signs webhooks with Ed25519 over "{timestamp}|{raw body}".
// TELNYX_PUBLIC_KEY = Mission Control > Account Settings > Keys & Credentials > Public Key.
function verifyWebhook(rawBody, signature, timestamp) {
  const pub = process.env.TELNYX_PUBLIC_KEY;
  if (!pub || !signature || !timestamp || !rawBody) return false;

  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 300) return false; // 5 min window

  try {
    const keyBytes = Buffer.from(pub, "base64");
    if (keyBytes.length !== 32) return false;
    const key = crypto.createPublicKey({
      key: Buffer.concat([ED25519_SPKI_PREFIX, keyBytes]),
      format: "der",
      type: "spki",
    });
    const message = Buffer.concat([Buffer.from(timestamp + "|", "utf8"), rawBody]);
    return crypto.verify(null, message, key, Buffer.from(signature, "base64"));
  } catch (e) {
    return false;
  }
}

module.exports = {
  isConfigured,
  errorMessage,
  searchAvailable,
  orderNumber,
  getOrder,
  findNumberId,
  releaseNumber,
  verifyWebhook,
};