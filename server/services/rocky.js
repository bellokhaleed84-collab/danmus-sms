const axios = require("axios");

function base() {
  return (process.env.ROCKY_API_URL || "https://rockysocials.com/api/v1").replace(/\/+$/, "");
}

function isConfigured() {
  return !!process.env.ROCKY_API_KEY;
}

function headers(extra) {
  return Object.assign(
    {
      Authorization: "Bearer " + process.env.ROCKY_API_KEY,
      Accept: "application/json",
    },
    extra || {}
  );
}

async function get(path, params) {
  const r = await axios.get(base() + path, {
    headers: headers(),
    params,
    timeout: 15000,
  });
  const body = r.data;
  if (!body || body.status !== "success") {
    throw new Error((body && body.message) || "Supplier error");
  }
  return body.data;
}

async function getBalance() {
  return get("/balance");
}

async function getCategories() {
  const d = await get("/categories");
  return Array.isArray(d.categories) ? d.categories : [];
}

async function getProducts() {
  const d = await get("/products");
  return Array.isArray(d.products) ? d.products : [];
}

// Returns { httpStatus, body } for ANY HTTP status.
// Throws only on network errors / timeouts (outcome unknown).
async function placeOrder(productId, quantity, idempotencyKey) {
  const r = await axios.post(
    base() + "/order",
    { product_id: productId, quantity },
    {
      headers: headers({
        "Content-Type": "application/json",
        "X-Idempotency-Key": idempotencyKey,
      }),
      timeout: 30000,
      validateStatus: () => true,
    }
  );
  return { httpStatus: r.status, body: r.data };
}

module.exports = { isConfigured, getBalance, getCategories, getProducts, placeOrder };