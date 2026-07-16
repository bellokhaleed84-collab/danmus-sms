"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import MobileNav from "@/components/MobileNav";
import API from "@/lib/api";

const statusColors: any = {
  pending_review: "bg-yellow-600/20 text-yellow-400",
  active: "bg-green-600/20 text-green-400",
  sold: "bg-blue-600/20 text-blue-400",
  rejected: "bg-red-600/20 text-red-400",
  removed: "bg-gray-600/20 text-gray-400",
};

export default function MyListingsPage() {
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMine() {
      try {
        const res = await API.get("/listings/mine");
        setListings(res.data);
      } catch (error) {
        console.log(error);
      } finally {
        setLoading(false);
      }
    }
    fetchMine();
  }, []);

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-10">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl md:text-4xl font-bold">My Listings</h1>
          <Link href="/marketplace/sell">
            <button className="bg-blue-600 hover:bg-blue-700 px-5 py-3 rounded-2xl font-semibold transition">
              + New Listing
            </button>
          </Link>
        </div>

        {loading ? (
          <p className="text-gray-400">Loading...</p>
        ) : listings.length === 0 ? (
          <p className="text-gray-400">You haven't listed anything yet.</p>
        ) : (
          <div className="space-y-4">
            {listings.map((l) => (
              <div key={l._id} className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-lg">{l.title}</h3>
                  <p className="text-gray-400 text-sm mt-1">₦{l.price?.toLocaleString()} · {l.platform}</p>
                </div>
                <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase ${statusColors[l.status]}`}>
                  {l.status.replace("_", " ")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <MobileNav />
    </main>
  );
}