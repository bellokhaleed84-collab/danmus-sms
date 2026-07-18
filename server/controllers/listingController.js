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

// ── BUY LISTING (instant release — credentials + funds move immediately) ──
const buyListing = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);

    if (!listing) return res.status(404).json({ message: "Listing not found" });
    if (listing.status !== "active") {
      return res.status(400).json({ message: "This listing is no longer available" });
    }

    const buyer = await User.findById(req.user._id);
    if (buyer.balance < listing.price) {
      return res.status(400).json({ message: "Insufficient balance" });
    }

    buyer.balance -= listing.price;
    await buyer.save();

    listing.status = "sold";
    listing.buyer = buyer._id;
    listing.soldAt = new Date();
    await listing.save();

    await Transaction.create({
      user: buyer._id,
      type: "marketplace_purchase",
      amount: listing.price,
      status: "successful",
      description: `Purchased ${listing.platform} account: ${listing.title}`,
      paymentReference: String(listing._id),
      platform: listing.platform,
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
  reviewListing,
};