const { getSetting } = require("../services/settings");

// Number rental is open to everyone only when the admin switch is ON
// (falls back to NUMBERS_PUBLIC=true until an admin saves the setting).
const numbersAccess = async (req, res, next) => {
  try {
    const s = await getSetting("numbers");
    if (s.enabled) return next();

    if (req.user && req.user.role === "admin") return next();

    return res.status(403).json({
      code: "NUMBERS_COMING_SOON",
      message: "Number rental is coming soon.",
    });
  } catch (error) {
    console.error("numbersAccess failed:", error.message);
    return res.status(500).json({ message: "Something went wrong. Please try again." });
  }
};

// NOTE: async. Always await it.
const isNumbersOpenFor = async (user) => {
  const s = await getSetting("numbers");
  return !!(s.enabled || (user && user.role === "admin"));
};

module.exports = { numbersAccess, isNumbersOpenFor };