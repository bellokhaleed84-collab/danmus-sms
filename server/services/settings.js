const Setting = require("../models/Setting");

// Fallbacks used until an admin saves a setting for that feature.
const DEFINITIONS = {
  boost: { label: "Boost", envFlag: "BOOST_PUBLIC", defaultMarkup: 40 },
  store: { label: "Account Store", envFlag: "STORE_PUBLIC", defaultMarkup: 30 },
};

const CACHE_MS = 10 * 1000;
const MIN_MARKUP = 0;
const MAX_MARKUP = 200;
const cache = {};

function httpError(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

function isValidMarkup(n) {
  return typeof n === "number" && Number.isFinite(n) && n >= MIN_MARKUP && n <= MAX_MARKUP;
}

function defaults(key) {
  const d = DEFINITIONS[key];
  return {
    enabled: process.env[d.envFlag] === "true",
    markupPercent: d.defaultMarkup,
    source: "default",
  };
}

async function readFresh(key) {
  const base = defaults(key);
  const doc = await Setting.findOne({ key }).lean();
  if (!doc) return base;
  return {
    enabled: !!doc.enabled,
    markupPercent: isValidMarkup(doc.markupPercent) ? doc.markupPercent : base.markupPercent,
    source: "database",
  };
}

function describe(key, state) {
  return {
    key,
    label: DEFINITIONS[key].label,
    enabled: state.enabled,
    markupPercent: state.markupPercent,
    source: state.source,
    minMarkup: MIN_MARKUP,
    maxMarkup: MAX_MARKUP,
  };
}

// Cached read used on every request (access checks and pricing).
async function getSetting(key) {
  if (!DEFINITIONS[key]) throw new Error("Unknown setting: " + key);
  const now = Date.now();
  const hit = cache[key];
  if (hit && now - hit.at < CACHE_MS) return hit.value;
  try {
    const value = await readFresh(key);
    cache[key] = { value, at: now };
    return value;
  } catch (e) {
    console.error("settings read failed:", key, e.message);
    if (hit) return hit.value;
    return defaults(key);
  }
}

async function getAllSettings() {
  const out = [];
  for (const key of Object.keys(DEFINITIONS)) {
    out.push(describe(key, await readFresh(key)));
  }
  return out;
}

async function updateSetting(key, patch) {
  if (!DEFINITIONS[key]) throw httpError(400, "Unknown setting");
  const body = patch || {};
  const current = await readFresh(key);
  const next = { enabled: current.enabled, markupPercent: current.markupPercent };

  if (body.enabled !== undefined) {
    if (typeof body.enabled !== "boolean") throw httpError(400, "enabled must be true or false");
    next.enabled = body.enabled;
  }
  if (body.markupPercent !== undefined) {
    if (typeof body.markupPercent !== "number" || !isValidMarkup(body.markupPercent)) {
      throw httpError(400, "Markup must be a number between " + MIN_MARKUP + " and " + MAX_MARKUP + " percent");
    }
    next.markupPercent = Math.round(body.markupPercent * 100) / 100;
  }

  await Setting.findOneAndUpdate(
    { key },
    { $set: next },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  delete cache[key];
  return describe(key, await readFresh(key));
}

// Price with markup, rounded up. Guards against floating point noise.
function applyMarkup(cost, percent) {
  return Math.ceil((Number(cost) * (100 + Number(percent))) / 100 - 1e-9);
}

module.exports = { getSetting, getAllSettings, updateSetting, applyMarkup };