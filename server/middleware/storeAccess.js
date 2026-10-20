// The store is admin-only until STORE_PUBLIC=true is set in the environment.
const storeAccess = (req, res, next) => {
  if (process.env.STORE_PUBLIC === "true") return next();

  if (req.user && req.user.role === "admin") return next();

  return res.status(403).json({
    code: "STORE_COMING_SOON",
    message: "The store is coming soon.",
  });
};

const isStoreOpenFor = (user) =>
  process.env.STORE_PUBLIC === "true" || (user && user.role === "admin");

module.exports = { storeAccess, isStoreOpenFor };