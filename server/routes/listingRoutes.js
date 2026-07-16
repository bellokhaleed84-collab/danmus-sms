const express = require("express");
const {
  createListing,
  getListings,
  getListingById,
  getMyListings,
  getAllListingsAdmin,
  buyListing,
  reviewListing,
} = require("../controllers/listingController");
const { protect, isAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", getListings);
router.get("/mine", protect, getMyListings);
router.get("/admin/all", protect, isAdmin, getAllListingsAdmin); // must come before /:id
router.get("/:id", getListingById);
router.post("/", protect, isAdmin, createListing);
router.post("/:id/buy", protect, buyListing);
router.put("/:id/review", protect, isAdmin, reviewListing);

module.exports = router;