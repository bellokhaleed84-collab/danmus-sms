"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import MobileNav from "@/components/MobileNav";
import API from "@/lib/api";

export default function MarketplacePage() {
  const [listings, setListings] = useState<any[]>([]);
  const [platform, setPlatform] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchListings() {
      setLoading(true);
      try {
        const query = platform ? `?platform=${platform}` : "";
        const res = await API.get(`/listings${query}`);
        setListings(res.data);
      } catch (error) {
        console.log(error);
      } finally {
        setLoading(false);
      }
    }
    fetchListings();
  }, [platform]);

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/20 blur-[120px] rounded-full" />
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 mb-10">
          <div>
            <h1 className="text-2xl md:text-5xl font-bold">Marketplace</h1>
            <p className="text-gray-400 mt-3 text-lg">Buy verified social media accounts</p>
          </div>
          <Link href="/marketplace/sell">
            <button className="bg-blue-600 hover:bg-blue-700 px-4 md:px-6 py-3 rounded-2xl font-semibold transition shadow-xl">
              Sell an Account
            </button>
          </Link>
        </div>

        {/* FILTER */}
        <div className="flex gap-3 mb-8 overflow-x-auto pb-2">
          {["", "instagram", "facebook", "tiktok", "twitter", "telegram", "whatsapp"].map((p) => (
            <button
              key={p}
              onClick={() => setPlatform(p)}
              className={`px-5 py-2 rounded-2xl font-semibold whitespace-nowrap transition ${
                platform === p
                  ? "bg-blue-600 text-white"
                  : "bg-[var(--card)] border border-[var(--border)] text-gray-400"
              }`}
            >
              {p === "" ? "All" : p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>

        {/* LISTINGS GRID */}
        {loading ? (
          <p className="text-gray-400">Loading listings...</p>
        ) : listings.length === 0 ? (
          <p className="text-gray-400">No listings available right now.</p>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {listings.map((listing) => (
              <Link key={listing._id} href={`/marketplace/${listing._id}`}>
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-6 shadow-xl hover:border-blue-500 transition cursor-pointer h-full">
                  <span className="inline-block bg-blue-600/20 text-blue-400 text-xs font-bold px-3 py-1 rounded-full uppercase">
                    {listing.platform}
                  </span>
                  <h3 className="text-xl font-bold mt-4">{listing.title}</h3>
                  <p className="text-gray-400 text-sm mt-2 line-clamp-2">{listing.description}</p>
                  <div className="flex items-center justify-between mt-5">
                    <span className="text-gray-400 text-sm">
                      {listing.followers?.toLocaleString()} followers
                    </span>
                    <span className="text-blue-500 font-bold text-lg">
                      ₦{listing.price?.toLocaleString()}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <MobileNav />
    </main>
  );
}