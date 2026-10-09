// Boost is admin-only until BOOST_PUBLIC=true is set in the environment.
const boostAccess = (req, res, next) => {
  if (process.env.BOOST_PUBLIC === "true") return next();

  if (req.user && req.user.role === "admin") return next();

  return res.status(403).json({
    code: "BOOST_COMING_SOON",
    message: "Boost is coming soon.",
  });
};

const isBoostOpenFor = (user) =>
  process.env.BOOST_PUBLIC === "true" || (user && user.role === "admin");

module.exports = { boostAccess, isBoostOpenFor };