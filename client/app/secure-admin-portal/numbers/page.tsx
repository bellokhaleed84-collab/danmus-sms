"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import API from "@/lib/api";

const FILTERS = ["all", "pending", "provisioning", "active", "expired", "released", "failed"];

const STATUS_STYLE: Record<string, string> = {
  active: "bg-green-500/20 text-green-500",
  pending: "bg-yellow-500/20 text-yellow-500",
  provisioning: "bg-orange-500/20 text-orange-400",
  expired: "bg-gray-500/20 text-gray-400",
  released: "bg-blue-500/20 text-blue-400",
  failed: "bg-red-500/20 text-red-500",
};

const NAIRA = "\u20A6";

export default function AdminNumbersPage() {
  const [rentals, setRentals] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({
    byStatus: {},
    revenue: 0,
    costUsd: 0,
    estimatedCostNgn: 0,
    estimatedProfit: 0,
    stuck: 0,
    expiringSoon: 0,
  });
  const [telnyx, setTelnyx] = useState<any>(null);
  const [markup, setMarkup] = useState<any>(null);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");

  const load = useCallback(async (f: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await API.get(`/numbers/admin/rentals?status=${f}`);
      setRentals(res.data.rentals || []);
      if (res.data.summary) setSummary(res.data.summary);
      setTelnyx(res.data.telnyx || null);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Could not load number rentals");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load(filter);
  }, [filter, load]);

  useEffect(() => {
    async function loadMarkup() {
      try {
        const res = await API.get("/admin/settings");
        const s = (res.data.settings || []).find((x: any) => x.key === "numbers");
        setMarkup(s || null);
      } catch (e) {
        console.log(e);
      }
    }
    loadMarkup();
  }, []);

  async function act(id: string, action: "sync" | "refund" | "release", confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusyId(id + action);
    try {
      const res = await API.post(`/numbers/admin/rentals/${id}/${action}`, {});
      window.alert(res.data.message || "Done");
      await load(filter);
    } catch (e: any) {
      window.alert(e?.response?.data?.message || "Action failed");
    }
    setBusyId("");
  }

  const by = summary.byStatus || {};

  return (
    <>
      <h1 className="text-2xl md:text-4xl font-bold mb-8">Number Rentals</h1>

      {/* PRICING STRIP */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 md:p-5 mb-6 flex items-center justify-between gap-3 flex-wrap">
        <div className="text-sm">
          <span className="text-gray-400">Pricing: </span>
          <span className="font-bold">{markup ? `${markup.markupPercent}% markup` : "..."}</span>
          <span className="text-gray-400"> {"\u00B7"} </span>
          <span className={markup?.enabled ? "text-green-500 font-semibold" : "text-yellow-500 font-semibold"}>
            {markup ? (markup.enabled ? "Live for all users" : "Admins only") : ""}
          </span>
        </div>
        <Link href="/secure-admin-portal/pricing">
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition">
            Change markup or switch on
          </button>
        </Link>
      </div>

      {/* SUMMARY */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-4">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 md:p-6 shadow-xl">
          <p className="text-gray-400 text-xs md:text-sm">Telnyx balance</p>
          <h3 className="text-lg md:text-3xl font-bold mt-2 text-blue-500 truncate">
            {telnyx ? `${telnyx.balance} ${telnyx.currency || ""}` : "Unavailable"}
          </h3>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 md:p-6 shadow-xl">
          <p className="text-gray-400 text-xs md:text-sm">Active numbers</p>
          <h3 className="text-xl md:text-4xl font-bold mt-2 text-green-500">{by.active || 0}</h3>
          <p className="text-gray-500 text-xs mt-1">{summary.expiringSoon || 0} expiring in 3 days</p>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 md:p-6 shadow-xl">
          <p className="text-gray-400 text-xs md:text-sm">Needs attention</p>
          <h3 className="text-xl md:text-4xl font-bold mt-2 text-orange-400">{summary.stuck || 0}</h3>
          <p className="text-gray-500 text-xs mt-1">stuck 5+ min</p>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 md:p-6 shadow-xl">
          <p className="text-gray-400 text-xs md:text-sm">Revenue</p>
          <h3 className="text-base md:text-2xl font-bold mt-2 text-green-500 truncate">
            {NAIRA}
            {Number(summary.revenue || 0).toLocaleString()}
          </h3>
          <p className="text-gray-400 text-xs mt-1 truncate">
            est. profit {NAIRA}
            {Number(summary.estimatedProfit || 0).toLocaleString()}
          </p>
        </div>
      </div>
      <p className="text-gray-500 text-xs mb-8">
        Profit is an estimate: what users paid minus Telnyx cost (${Number(summary.costUsd || 0).toFixed(2)}) at today&apos;s
        exchange rate.
      </p>

      {/* FILTERS */}
      <div className="flex gap-2 md:gap-3 overflow-x-auto pb-1 mb-6">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 md:px-4 py-2 rounded-2xl text-xs md:text-sm font-semibold transition shrink-0 capitalize ${
              filter === f ? "bg-blue-600 text-white" : "bg-[var(--input)] border border-[var(--border)]"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-2xl p-4 mb-6 text-sm">{error}</div>
      )}

      {loading ? (
        <div className="text-center text-gray-400 py-10 text-sm">Loading...</div>
      ) : rentals.length === 0 ? (
        <div className="text-center text-gray-400 py-10 text-sm">No rentals in this view</div>
      ) : (
        <div className="space-y-3 md:space-y-4">
          {rentals.map((r) => {
            const waiting = r.status === "pending" || r.status === "provisioning";
            const cost = Number(r.upfrontCostUsd || 0) + Number(r.monthlyCostUsd || 0);
            return (
              <div key={r._id} className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 md:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-sm md:text-lg truncate">{r.phoneNumber}</p>
                    <p className="text-gray-400 text-xs md:text-sm mt-1 truncate">
                      {r.user?.name} {"\u2014"} {r.user?.email}
                    </p>
                    <p className="text-gray-500 text-[11px] md:text-xs mt-1">
                      {r.region || r.country}
                      {r.numberType ? ` \u00B7 ${r.numberType}` : ""} {"\u00B7"} cost ${cost.toFixed(2)}
                    </p>
                    <p className="text-gray-500 text-[11px] md:text-xs mt-1">
                      Created {new Date(r.createdAt).toLocaleString()}
                      {r.status === "active" && r.expiresAt
                        ? ` \u00B7 expires ${new Date(r.expiresAt).toLocaleDateString()}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <p className="text-base md:text-xl font-bold whitespace-nowrap text-blue-500">
                      {NAIRA}
                      {Number(r.pricePaid).toLocaleString()}
                    </p>
                    <div className="flex gap-2 flex-wrap justify-end">
                      {r.stuck && (
                        <span className="px-2 md:px-3 py-1 rounded-xl text-[11px] md:text-xs font-semibold bg-red-500/20 text-red-500">
                          stuck
                        </span>
                      )}
                      <span
                        className={`px-2 md:px-3 py-1 rounded-xl text-[11px] md:text-xs font-semibold ${
                          STATUS_STYLE[r.status] || "bg-gray-500/20 text-gray-400"
                        }`}
                      >
                        {r.status}
                      </span>
                    </div>
                  </div>
                </div>

                {r.failReason && <p className="text-gray-400 text-xs mt-3 break-words">Note: {r.failReason}</p>}

                {waiting && (
                  <div className="flex gap-2 flex-wrap mt-3">
                    <button
                      onClick={() => act(r._id, "sync")}
                      disabled={busyId === r._id + "sync"}
                      className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 px-4 py-2 rounded-xl text-xs md:text-sm font-semibold transition"
                    >
                      {busyId === r._id + "sync" ? "Checking..." : "Check with Telnyx"}
                    </button>
                    <button
                      onClick={() =>
                        act(
                          r._id,
                          "refund",
                          "Refund this user's wallet? Do 'Check with Telnyx' first, because if Telnyx already sold you this number you will still pay for it. This can only be done once."
                        )
                      }
                      disabled={busyId === r._id + "refund"}
                      className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 px-4 py-2 rounded-xl text-xs md:text-sm font-semibold transition"
                    >
                      {busyId === r._id + "refund" ? "Refunding..." : "Refund to wallet"}
                    </button>
                  </div>
                )}

                {r.status === "active" && (
                  <div className="flex gap-2 flex-wrap mt-3">
                    <button
                      onClick={() =>
                        act(
                          r._id,
                          "release",
                          "Release this number back to Telnyx? The user will lose it immediately and no refund is given."
                        )
                      }
                      disabled={busyId === r._id + "release"}
                      className="bg-yellow-600 hover:bg-yellow-700 text-white disabled:opacity-50 px-4 py-2 rounded-xl text-xs md:text-sm font-semibold transition"
                    >
                      {busyId === r._id + "release" ? "Releasing..." : "Release number"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}