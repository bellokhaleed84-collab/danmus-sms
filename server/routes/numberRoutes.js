const express = require("express");
const {
  getCountries,
  getAvailable,
  rentNumber,
  getMyRentals,
  getMessages,
  getAdminRentals,
} = require("../controllers/numberController");
const { protect, isAdmin } = require("../middleware/authMiddleware");
const { numbersAccess, isNumbersOpenFor } = require("../middleware/numbersAccess");

const router = express.Router();

// The webhook is mounted separately in app.js (needs the raw body).

// Tells the frontend whether to show the real page or "coming soon".
router.get("/access", protect, async (req, res) => {
  try {
    res.status(200).json({ open: !!(await isNumbersOpenFor(req.user)) });
  } catch (error) {
    res.status(200).json({ open: false });
  }
});

// Everything below requires login AND number-rental access.
router.use(protect, numbersAccess);

router.get("/countries", getCountries);
router.get("/available", getAvailable);
router.get("/mine", getMyRentals); // must come before /:id/messages
router.get("/admin/rentals", isAdmin, getAdminRentals);
router.post("/rent", rentNumber);
router.get("/:id/messages", getMessages);

module.exports = router;