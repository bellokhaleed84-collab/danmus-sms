"use client";

import { useEffect, useState } from "react";
import API from "@/lib/api";

export default function AdminListingsPage() {
  const [loading, setLoading] = useState(true);
  const [listings, setListings] = useState<any[]>([]);
  const [listingFilter, setListingFilter] = useState("all");
  const [showListingForm, setShowListingForm] = useState(false);
  const [listingLoading, setListingLoading] = useState(false);
  const [listingForm, setListingForm] = useState({
    platform: "instagram",
    title: "",
    description: "",
    followers: "",
    accountAge: "",
    price: "",
    username: "",
    password: "",
    email: "",
    recoveryInfo: "",
  });
  const [listingActionLoading, setListingActionLoading] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const token = localStorage.getItem("token");
      try {
        const res = await API.get("/listings/admin/all", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setListings(res.data);
      } catch (error) {
        console.log(error);
      }
      setLoading(false);
    }
    load();
  }, []);

  function handleListingFormChange(e: any) {
    setListingForm({ ...listingForm, [e.target.name]: e.target.value });
  }

  async function handleCreateListing(e: any) {
    e.preventDefault();
    const token = localStorage.getItem("token");
    setListingLoading(true);
    try {
      const res = await API.post(
        "/listings",
        {
          platform: listingForm.platform,
          title: listingForm.title,
          description: listingForm.description,
          followers: Number(listingForm.followers),
          accountAge: listingForm.accountAge,
          price: Number(listingForm.price),
          credentials: {
            username: listingForm.username,
            password: listingForm.password,
            email: listingForm.email,
            recoveryInfo: listingForm.recoveryInfo,
          },
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setListings((prev) => [res.data.listing, ...prev]);
      alert("Listing created and live");
      setShowListingForm(false);
      setListingForm({
        platform: "instagram",
        title: "",
        description: "",
        followers: "",
        accountAge: "",
        price: "",
        username: "",
        password: "",
        email: "",
        recoveryInfo: "",
      });
    } catch (error: any) {
      alert(error.response?.data?.message || "Failed to create listing");
    }
    setListingLoading(false);
  }

  async function handleListingStatusChange(listingId: string, status: string) {
    const token = localStorage.getItem("token");
    setListingActionLoading(listingId + "-" + status);
    try {
      const res = await API.put(
        `/listings/${listingId}/review`,
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setListings((prev) =>
        prev.map((l) => (l._id === listingId ? { ...l, status: res.data.listing.status } : l))
      );
    } catch (error: any) {
      alert(error.response?.data?.message || "Failed to update listing");
    }
    setListingActionLoading(null);
  }

  const filteredListings = listings.filter(
    (l) => listingFilter === "all" || l.status === listingFilter
  );

  const listingStatusColors: any = {
    pending_review: "bg-yellow-500/20 text-yellow-500",
    active: "bg-green-500/20 text-green-500",
    sold: "bg-blue-500/20 text-blue-500",
    rejected: "bg-red-500/20 text-red-500",
    removed: "bg-gray-500/20 text-gray-400",
  };

  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="w-14 h-14 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
        <h1 className="text-xl font-bold">Loading listings...</h1>
      </div>
    );
  }

  return (
    <>
      {showListingForm && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center px-4 py-8 overflow-y-auto">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-6 md:p-8 w-full max-w-lg shadow-2xl my-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl md:text-2xl font-bold">Create Listing</h2>
              <button
                onClick={() => setShowListingForm(false)}
                className="bg-[var(--input)] border border-[var(--border)] px-4 py-2 rounded-2xl font-semibold text-sm"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleCreateListing} className="space-y-5">
              <div>
                <label className="block mb-2 font-semibold text-sm md:text-base">Platform</label>
                <select
                  name="platform"
                  value={listingForm.platform}
                  onChange={handleListingFormChange}
                  className="w-full bg-[var(--input)] border border-[var(--border)] rounded-2xl px-5 py-3 outline-none focus:border-blue-500"
                >
                  <option value="instagram">Instagram</option>
                  <option value="facebook">Facebook</option>
                  <option value="tiktok">TikTok</option>
                  <option value="twitter">Twitter/X</option>
                  <option value="telegram">Telegram</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block mb-2 font-semibold text-sm md:text-base">Title</label>
                <input
                  name="title"
                  value={listingForm.title}
                  onChange={handleListingFormChange}
                  required
                  className="w-full bg-[var(--input)] border border-[var(--border)] rounded-2xl px-5 py-3 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block mb-2 font-semibold text-sm md:text-base">Description</label>
                <textarea
                  name="description"
                  value={listingForm.description}
                  onChange={handleListingFormChange}
                  rows={3}
                  required
                  className="w-full bg-[var(--input)] border border-[var(--border)] rounded-2xl px-5 py-3 outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-2 font-semibold text-sm md:text-base">Followers</label>
                  <input
                    name="followers"
                    type="number"
                    value={listingForm.followers}
                    onChange={handleListingFormChange}
                    className="w-full bg-[var(--input)] border border-[var(--border)] rounded-2xl px-5 py-3 outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block mb-2 font-semibold text-sm md:text-base">Account Age</label>
                  <input
                    name="accountAge"
                    value={listingForm.accountAge}
                    onChange={handleListingFormChange}
                    placeholder="e.g. 2 years"
                    className="w-full bg-[var(--input)] border border-[var(--border)] rounded-2xl px-5 py-3 outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-2 font-semibold text-sm md:text-base">Price (₦)</label>
                <input
                  name="price"
                  type="number"
                  value={listingForm.price}
                  onChange={handleListingFormChange}
                  required
                  className="w-full bg-[var(--input)] border border-[var(--border)] rounded-2xl px-5 py-3 outline-none focus:border-blue-500"
                />
              </div>

              <hr className="border-[var(--border)]" />

              <div>
                <label className="block mb-2 font-semibold text-sm md:text-base">Username</label>
                <input
                  name="username"
                  value={listingForm.username}
                  onChange={handleListingFormChange}
                  required
                  className="w-full bg-[var(--input)] border border-[var(--border)] rounded-2xl px-5 py-3 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block mb-2 font-semibold text-sm md:text-base">Password</label>
                <input
                  name="password"
                  type="password"
                  value={listingForm.password}
                  onChange={handleListingFormChange}
                  required
                  className="w-full bg-[var(--input)] border border-[var(--border)] rounded-2xl px-5 py-3 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block mb-2 font-semibold text-sm md:text-base">Recovery Email (optional)</label>
                <input
                  name="email"
                  value={listingForm.email}
                  onChange={handleListingFormChange}
                  className="w-full bg-[var(--input)] border border-[var(--border)] rounded-2xl px-5 py-3 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block mb-2 font-semibold text-sm md:text-base">Other Recovery Info (optional)</label>
                <input
                  name="recoveryInfo"
                  value={listingForm.recoveryInfo}
                  onChange={handleListingFormChange}
                  className="w-full bg-[var(--input)] border border-[var(--border)] rounded-2xl px-5 py-3 outline-none focus:border-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={listingLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 py-4 rounded-2xl font-bold transition disabled:opacity-50"
              >
                {listingLoading ? "Creating..." : "Create Listing"}
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4 mb-6 md:mb-8 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl md:text-4xl font-bold">Marketplace Listings</h1>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-2 md:gap-3 overflow-x-auto pb-1 -mx-1 px-1 md:flex-wrap md:overflow-visible">
            {["all", "pending_review", "active", "sold", "rejected", "removed"].map((f) => (
              <button
                key={f}
                onClick={() => setListingFilter(f)}
                className={`px-3 md:px-4 py-2 rounded-2xl text-xs md:text-sm font-semibold transition shrink-0 capitalize ${
                  listingFilter === f
                    ? "bg-blue-600 text-white"
                    : "bg-[var(--input)] border border-[var(--border)]"
                }`}
              >
                {f === "all" ? "All" : f.replace("_", " ")}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowListingForm(true)}
            className="bg-blue-600 hover:bg-blue-700 px-5 py-3 rounded-2xl font-semibold transition shrink-0"
          >
            + New Listing
          </button>
        </div>
      </div>

      {filteredListings.length === 0 && (
        <div className="bg-[var(--input)] border border-[var(--border)] rounded-2xl p-8 md:p-10 text-center">
          <h3 className="text-lg md:text-2xl font-bold">No Listings Found</h3>
        </div>
      )}

      <div className="space-y-3 md:space-y-4">
        {filteredListings.map((listing) => (
          <div
            key={listing._id}
            className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 md:p-5"
          >
            <span className="inline-block bg-blue-600/20 text-blue-400 text-[11px] md:text-xs font-bold px-3 py-1 rounded-full uppercase mb-2">
              {listing.platform}
            </span>
            <div className={`px-3 py-1 rounded-xl text-xs font-semibold w-fit capitalize mb-2 ${listingStatusColors[listing.status]}`}>
              {listing.status.replace("_", " ")}
            </div>
            <h3 className="font-bold text-base md:text-lg truncate">{listing.title}</h3>
            <p className="text-gray-400 text-xs md:text-sm mt-1">
              ₦{Number(listing.price).toLocaleString()} · {listing.followers?.toLocaleString() || 0} followers
            </p>
            <p className="text-gray-500 text-[11px] md:text-xs mt-1">
              Created: {new Date(listing.createdAt).toLocaleString()}
            </p>

            <div className="flex gap-2 flex-wrap mt-3">
              {listing.status !== "active" && listing.status !== "sold" && (
                <button
                  onClick={() => handleListingStatusChange(listing._id, "active")}
                  disabled={listingActionLoading === listing._id + "-active"}
                  className="bg-green-600 hover:bg-green-700 px-3 py-2 rounded-xl text-xs font-semibold transition"
                >
                  {listingActionLoading === listing._id + "-active" ? "..." : "Activate"}
                </button>
              )}
              {listing.status !== "removed" && listing.status !== "sold" && (
                <button
                  onClick={() => handleListingStatusChange(listing._id, "removed")}
                  disabled={listingActionLoading === listing._id + "-removed"}
                  className="bg-red-600 hover:bg-red-700 px-3 py-2 rounded-xl text-xs font-semibold transition"
                >
                  {listingActionLoading === listing._id + "-removed" ? "..." : "Remove"}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}