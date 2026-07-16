"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import MobileNav from "@/components/MobileNav";
import API from "@/lib/api";

export default function ListingDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [listing, setListing] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);
  const [purchased, setPurchased] = useState<any>(null);

  useEffect(() => {
    async function fetchListing() {
      try {
        const res = await API.get(`/listings/${id}`);
        setListing(res.data);
      } catch (error) {
        console.log(error);
      } finally {
        setLoading(false);
      }
    }
    fetchListing();
  }, [id]);

  async function handleBuy() {
    if (!confirm(`Buy this account for ₦${listing.price?.toLocaleString()}? This cannot be undone.`)) {
      return;
    }
    setBuying(true);
    try {
      const res = await API.post(`/listings/${id}/buy`);
      setPurchased(res.data.credentials);
    } catch (error: any) {
      alert(error?.response?.data?.message || "Purchase failed");
    } finally {
      setBuying(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </main>
    );
  }

  if (!listing) {
    return (
      <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex items-center justify-center">
        <p className="text-gray-400">Listing not found.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-10">
        <Link href="/marketplace">
          <button className="text-gray-400 hover:text-white mb-6">← Back to Marketplace</button>
        </Link>

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-6 md:p-10 shadow-2xl">
          <span className="inline-block bg-blue-600/20 text-blue-400 text-xs font-bold px-3 py-1 rounded-full uppercase">
            {listing.platform}
          </span>

          <h1 className="text-2xl md:text-4xl font-bold mt-4">{listing.title}</h1>
          <p className="text-gray-400 mt-4 leading-relaxed">{listing.description}</p>

          <div className="grid grid-cols-2 gap-4 mt-8">
            <div className="bg-[var(--input)] rounded-2xl p-5">
              <p className="text-gray-400 text-sm">Followers</p>
              <p className="text-xl font-bold mt-1">{listing.followers?.toLocaleString() || "N/A"}</p>
            </div>
            <div className="bg-[var(--input)] rounded-2xl p-5">
              <p className="text-gray-400 text-sm">Account Age</p>
              <p className="text-xl font-bold mt-1">{listing.accountAge || "N/A"}</p>
            </div>
          </div>

          <div className="flex items-center justify-between mt-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-6">
            <span className="text-white/80">Price</span>
            <span className="text-3xl font-bold text-white">₦{listing.price?.toLocaleString()}</span>
          </div>

          {!purchased ? (
            <button
              onClick={handleBuy}
              disabled={buying}
              className="w-full bg-blue-600 hover:bg-blue-700 py-5 rounded-2xl font-bold text-lg transition mt-8 disabled:opacity-50"
            >
              {buying ? "Processing..." : "Buy Now"}
            </button>
          ) : (
            <div className="mt-8 bg-green-600/20 border border-green-600 rounded-2xl p-6 space-y-3">
              <h3 className="text-green-400 font-bold text-xl mb-3">Purchase Successful — Login Details</h3>
              <p><span className="text-gray-400">Username:</span> <span className="font-bold">{purchased.username}</span></p>
              <p><span className="text-gray-400">Password:</span> <span className="font-bold">{purchased.password}</span></p>
              {purchased.email && (
                <p><span className="text-gray-400">Recovery Email:</span> <span className="font-bold">{purchased.email}</span></p>
              )}
              {purchased.recoveryInfo && (
                <p><span className="text-gray-400">Recovery Info:</span> <span className="font-bold">{purchased.recoveryInfo}</span></p>
              )}
              <p className="text-yellow-400 text-sm mt-4">
                ⚠️ Save these details now — change the password and recovery email immediately after logging in.
              </p>
            </div>
          )}
        </div>
      </div>

      <MobileNav />
    </main>
  );
}