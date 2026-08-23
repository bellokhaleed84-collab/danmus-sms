const Listing = require("../models/Listing");
const User = require("../models/User");
const Transaction = require("../models/Transaction");
const { encrypt, decrypt } = require("../utils/encryption");

// ── CREATE LISTING (admin only, goes live immediately) ──
const createListing = async (req, res) => {
  try {
    const {
      platform,
      title,
      description,
      followers,
      accountAge,
      price,
      previewLink,
      credentials,
      screenshots,
    } = req.body;

    if (
      !platform ||
      !title ||
      !description ||
      !price ||
      !credentials?.username ||
      !credentials?.password
    ) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const listing = await Listing.create({
      seller: req.user._id,
      platform,
      title,
      description,
      followers,
      accountAge,
      price,
      previewLink,
      credentials: {
        username: credentials.username,
        password: encrypt(credentials.password),
        email: credentials.email,
        recoveryInfo: credentials.recoveryInfo,
      },
      screenshots,
      status: "active",
    });

    res.status(201).json({
      message: "Listing created and live",
      listing,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── BROWSE ACTIVE LISTINGS (public, credentials hidden) ──
const getListings = async (req, res) => {
  try {
    const { platform } = req.query;
    const filter = { status: "active" };
    if (platform) filter.platform = platform;

    const listings = await Listing.find(filter)
      .select("-credentials")
      .populate("seller", "name")
      .sort({ createdAt: -1 });

    res.status(200).json(listings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── GET SINGLE LISTING (public, credentials hidden) ──
const getListingById = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id)
      .select("-credentials")
      .populate("seller", "name");

    if (!listing) return res.status(404).json({ message: "Listing not found" });

    res.status(200).json(listing);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── MY LISTINGS (admin's own created listings, includes credentials) ──
const getMyListings = async (req, res) => {
  try {
    const listings = await Listing.find({ seller: req.user._id }).sort({
      createdAt: -1,
    });
    res.status(200).json(listings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── ADMIN: GET ALL LISTINGS (any status) ──
const getAllListingsAdmin = async (req, res) => {
  try {
    const listings = await Listing.find({})
      .select("-credentials")
      .sort({ createdAt: -1 });
    res.status(200).json(listings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── BUY LISTING (atomic — cannot be sold twice) ──
const buyListing = async (req, res) => {
  try {
    // Step 1: atomically claim the listing. This findOneAndUpdate is a
    // single atomic operation in MongoDB — if two buyers hit this at the
    // exact same time, only the FIRST one's filter (status: "active")
    // will still match; the second gets null back and is rejected below.
    // This is what actually prevents the same account being sold twice —
    // the old code read the listing, checked status in JS, then saved,
    // which left a window where two requests could both pass the check.
    const listing = await Listing.findOneAndUpdate(
      { _id: req.params.id, status: "active" },
      { $set: { status: "sold", buyer: req.user._id, soldAt: new Date() } },
      { new: true }
    );

    if (!listing) {
      return res.status(400).json({ message: "This listing is no longer available" });
    }

    // Step 2: atomically charge the buyer, only if they actually have
    // enough balance. Also atomic, for the same reason as above.
    const buyer = await User.findOneAndUpdate(
      { _id: req.user._id, balance: { $gte: listing.price } },
      { $inc: { balance: -listing.price } },
      { new: true }
    );

    if (!buyer) {
      // Buyer couldn't afford it after all — release the listing back
      // to "active" so someone else can still buy it.
      await Listing.findByIdAndUpdate(listing._id, {
        $set: { status: "active", buyer: null, soldAt: null },
      });
      return res.status(400).json({ message: "Insufficient balance" });
    }

    await Transaction.create({
      user: buyer._id,
      type: "marketplace_purchase",
      amount: listing.price,
      status: "successful",
      description: `Purchased ${listing.platform} account: ${listing.title}`,
      paymentReference: String(listing._id),
    });

    res.status(200).json({
      message: "Purchase successful",
      credentials: {
        username: listing.credentials.username,
        password: decrypt(listing.credentials.password),
        email: listing.credentials.email,
        recoveryInfo: listing.credentials.recoveryInfo,
      },
      balance: buyer.balance,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── MY PURCHASES (buyer's own bought listings, credentials hidden) ──
const getMyPurchases = async (req, res) => {
  try {
    const purchases = await Listing.find({ buyer: req.user._id, status: "sold" })
      .select("-credentials")
      .sort({ soldAt: -1 });
    res.status(200).json(purchases);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── VIEW LOGIN DETAILS FOR A PAST PURCHASE (buyer only, re-viewable anytime) ──
const getPurchaseCredentials = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ message: "Listing not found" });

    if (!listing.buyer || String(listing.buyer) !== String(req.user._id)) {
      return res.status(403).json({ message: "You did not purchase this listing" });
    }

    res.status(200).json({
      credentials: {
        username: listing.credentials.username,
        password: decrypt(listing.credentials.password),
        email: listing.credentials.email,
        recoveryInfo: listing.credentials.recoveryInfo,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── ADMIN: APPROVE / REJECT / REMOVE LISTING ──
const reviewListing = async (req, res) => {
  try {
    const { status } = req.body;

    if (!["active", "rejected", "removed"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ message: "Listing not found" });

    listing.status = status;
    await listing.save();

    res.status(200).json({ message: `Listing ${status}`, listing });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createListing,
  getListings,
  getListingById,
  getMyListings,
  getAllListingsAdmin,
  buyListing,
  getMyPurchases,
  getPurchaseCredentials,
  reviewListing,
};