const { getSetting } = require("../services/settings");

// The store is open to everyone only when the admin switch is ON
// (falls back to STORE_PUBLIC=true until an admin saves the setting).
const storeAccess = async (req, res, next) => {
  try {
    const s = await getSetting("store");
    if (s.enabled) return next();

    if (req.user && req.user.role === "admin") return next();

    return res.status(403).json({
      code: "STORE_COMING_SOON",
      message: "The store is coming soon.",
    });
  } catch (error) {
    console.error("storeAccess failed:", error.message);
    return res.status(500).json({ message: "Something went wrong. Please try again." });
  }
};

// NOTE: async. Always await it.
const isStoreOpenFor = async (user) => {
  const s = await getSetting("store");
  return !!(s.enabled || (user && user.role === "admin"));
};

module.exports = { storeAccess, isStoreOpenFor };