"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import MobileNav from "@/components/MobileNav";
import API from "@/lib/api";

const STATUS: Record<string, { label: string; cls: string }> = {
  active: { label: "Active", cls: "bg-green-500/20 text-green-500" },
  provisioning: { label: "Setting up", cls: "bg-yellow-500/20 text-yellow-500" },
  pending: { label: "Pending", cls: "bg-yellow-500/20 text-yellow-500" },
  expired: { label: "Expired", cls: "bg-gray-500/20 text-gray-400" },
  released: { label: "Released", cls: "bg-gray-500/20 text-gray-400" },
  failed: { label: "Failed", cls: "bg-red-500/20 text-red-500" },
};

function daysLeft(expiresAt?: string) {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

export default function MyNumbersPage() {
  const [rentals, setRentals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await API.get("/numbers/mine");
        setRentals(res.data || []);
      } catch (e: any) {
        setError(e.response?.data?.message || "Could not load your numbers.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function copy(num: string) {
    try {
      await navigator.clipboard.writeText(num);
      setCopied(num);
      setTimeout(() => setCopied(""), 1500);
    } catch (e) {
      console.log(e);
    }
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] pb-28 md:pb-0">
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-10">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-8">
          <h1 className="text-2xl md:text-4xl font-bold">My Numbers</h1>
          <div className="flex gap-3">
            <Link href="/numbers">
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-2xl font-semibold transition">
                + Rent a Number
              </button>
            </Link>
            <Link href="/dashboard">
              <button className="bg-[var(--card)] border border-[var(--border)] px-5 py-3 rounded-2xl font-semibold">
                Dashboard
              </button>
            </Link>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-2xl p-4 mb-6 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-gray-400">Loading...</p>
        ) : rentals.length === 0 && !error ? (
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-10 text-center">
            <p className="font-bold text-lg">You have not rented a number yet</p>
            <p className="text-gray-400 text-sm mt-1">Rent one to receive SMS on it for a month.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {rentals.map((r) => {
              const st = STATUS[r.status] || { label: r.status, cls: "bg-gray-500/20 text-gray-400" };
              const left = daysLeft(r.expiresAt);
              return (
                <div key={r._id} className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-5 md:p-6 shadow-xl">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xl md:text-2xl font-bold tracking-wide break-all">{r.phoneNumber}</p>
                      <p className="text-gray-400 text-sm mt-1">
                        {r.region || r.country}
                        {r.numberType ? ` \u00B7 ${r.numberType.replace("_", "-")}` : ""}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-xl text-xs font-semibold shrink-0 ${st.cls}`}>{st.label}</span>
                  </div>

                  {r.status === "active" && r.expiresAt && (
                    <p className="text-gray-400 text-sm mt-3">
                      Expires {new Date(r.expiresAt).toLocaleDateString()}
                      {left !== null ? ` (${left} day${left === 1 ? "" : "s"} left)` : ""}
                    </p>
                  )}
                  {r.status === "provisioning" && (
                    <p className="text-yellow-500 text-sm mt-3">
                      Your number is being set up. This can take a few minutes.
                    </p>
                  )}

                  <div className="flex gap-3 mt-4 flex-wrap">
                    <Link href={`/numbers/mine/${r._id}`}>
                      <button className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl text-sm font-bold transition">
                        Open Inbox
                      </button>
                    </Link>
                    <button
                      onClick={() => copy(r.phoneNumber)}
                      className="bg-[var(--input)] border border-[var(--border)] px-5 py-2 rounded-xl text-sm font-semibold"
                    >
                      {copied === r.phoneNumber ? "Copied!" : "Copy number"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <MobileNav />
    </main>
  );
}