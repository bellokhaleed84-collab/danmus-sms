const { getSetting } = require("../services/settings");

// Boost is open to everyone only when the admin switch is ON
// (falls back to BOOST_PUBLIC=true until an admin saves the setting).
const boostAccess = async (req, res, next) => {
  try {
    const s = await getSetting("boost");
    if (s.enabled) return next();

    if (req.user && req.user.role === "admin") return next();

    return res.status(403).json({
      code: "BOOST_COMING_SOON",
      message: "Boost is coming soon.",
    });
  } catch (error) {
    console.error("boostAccess failed:", error.message);
    return res.status(500).json({ message: "Something went wrong. Please try again." });
  }
};

// NOTE: async. Always await it.
const isBoostOpenFor = async (user) => {
  const s = await getSetting("boost");
  return !!(s.enabled || (user && user.role === "admin"));
};

module.exports = { boostAccess, isBoostOpenFor };