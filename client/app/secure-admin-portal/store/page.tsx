"use client";

import { useCallback, useEffect, useState } from "react";
import API from "@/lib/api";

const FILTERS = ["all", "review", "stuck", "pending", "completed", "failed", "refunded"];

const STATUS_STYLE: Record<string, string> = {
  completed: "bg-green-500/20 text-green-500",
  pending: "bg-yellow-500/20 text-yellow-500",
  review: "bg-orange-500/20 text-orange-400",
  failed: "bg-red-500/20 text-red-500",
  refunded: "bg-blue-500/20 text-blue-400",
};

export default function AdminStorePage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({ byStatus: {}, revenue: 0, cost: 0, stuckPending: 0 });
  const [filter, setFilter] = useState("all");
  const [balance, setBalance] = useState<any>(null);
  const [balanceError, setBalanceError] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");

  const load = useCallback(async (f: string) => {
    const token = localStorage.getItem("token");
    setLoading(true);
    setError("");
    try {
      const res = await API.get(`/admin/store/orders?status=${f}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOrders(res.data.orders || []);
      setSummary(res.data.summary || { byStatus: {}, revenue: 0, cost: 0, stuckPending: 0 });
    } catch (e: any) {
      setError(e?.response?.data?.message || "Could not load store orders");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load(filter);
  }, [filter, load]);

  useEffect(() => {
    async function loadBalance() {
      const token = localStorage.getItem("token");
      try {
        const res = await API.get("/store/admin/balance", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setBalance(res.data);
      } catch (e: any) {
        setBalanceError(e?.response?.data?.message || "Unavailable");
      }
    }
    loadBalance();
  }, []);

  async function refund(id: string) {
    if (!window.confirm("Refund this order to the user's wallet? This can only be done once.")) return;
    const token = localStorage.getItem("token");
    setBusyId(id);
    try {
      await API.post(
        `/store/admin/orders/${id}/refund`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await load(filter);
    } catch (e: any) {
      window.alert(e?.response?.data?.message || "Refund failed");
    }
    setBusyId("");
  }

  const by = summary.byStatus || {};
  const profit = Number(summary.revenue || 0) - Number(summary.cost || 0);

  return (
    <>
      <h1 className="text-2xl md:text-4xl font-bold mb-8">Store Orders</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-8">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 md:p-6 shadow-xl">
          <p className="text-gray-400 text-xs md:text-sm">Supplier balance</p>
          <h3 className="text-lg md:text-3xl font-bold mt-2 text-blue-500 truncate">
            {balance ? `${balance.balance} ${balance.currency || ""}` : balanceError || "..."}
          </h3>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 md:p-6 shadow-xl">
          <p className="text-gray-400 text-xs md:text-sm">Needs review</p>
          <h3 className="text-xl md:text-4xl font-bold mt-2 text-orange-400">{by.review || 0}</h3>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 md:p-6 shadow-xl">
          <p className="text-gray-400 text-xs md:text-sm">Stuck pending (5+ min)</p>
          <h3 className="text-xl md:text-4xl font-bold mt-2 text-yellow-500">{summary.stuckPending || 0}</h3>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 md:p-6 shadow-xl">
          <p className="text-gray-400 text-xs md:text-sm">Sales / profit (completed)</p>
          <h3 className="text-base md:text-2xl font-bold mt-2 text-green-500 truncate">
            {"\u20A6"}{Number(summary.revenue || 0).toLocaleString()}
          </h3>
          <p className="text-gray-400 text-xs mt-1 truncate">
            profit {"\u20A6"}{profit.toLocaleString()} (supplier cost in the supplier currency, so compare with care)
          </p>
        </div>
      </div>

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
      ) : orders.length === 0 ? (
        <div className="text-center text-gray-400 py-10 text-sm">No orders in this view</div>
      ) : (
        <div className="space-y-3 md:space-y-4">
          {orders.map((o) => (
            <div key={o._id} className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 md:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-sm md:text-lg truncate">
                    {o.productName} x{o.quantity}
                  </p>
                  <p className="text-gray-400 text-xs md:text-sm mt-1 truncate">
                    {o.user?.name} {"\u2014"} {o.user?.email}
                  </p>
                  <p className="text-gray-500 text-[11px] md:text-xs mt-1">
                    {new Date(o.createdAt).toLocaleString()} {"\u00B7"} order {String(o._id).slice(-8)}
                    {o.supplierOrderId ? ` \u00B7 supplier #${o.supplierOrderId}` : ""}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <p className="text-base md:text-xl font-bold whitespace-nowrap text-blue-500">
                    {"\u20A6"}{Number(o.price).toLocaleString()}
                  </p>
                  <div className="flex gap-2 flex-wrap justify-end">
                    {o.stuck && (
                      <span className="px-2 md:px-3 py-1 rounded-xl text-[11px] md:text-xs font-semibold bg-red-500/20 text-red-500">
                        stuck
                      </span>
                    )}
                    <span
                      className={`px-2 md:px-3 py-1 rounded-xl text-[11px] md:text-xs font-semibold ${
                        STATUS_STYLE[o.status] || "bg-gray-500/20 text-gray-400"
                      }`}
                    >
                      {o.status}
                    </span>
                  </div>
                </div>
              </div>

              {o.failReason && <p className="text-gray-400 text-xs mt-3 break-words">Reason: {o.failReason}</p>}

              {o.status === "review" && !o.refunded && (
                <button
                  onClick={() => refund(o._id)}
                  disabled={busyId === o._id}
                  className="mt-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 px-4 py-2 rounded-xl text-xs md:text-sm font-semibold transition"
                >
                  {busyId === o._id ? "Refunding..." : "Refund to wallet"}
                </button>
              )}
              {o.stuck && (
                <p className="text-yellow-500 text-xs mt-3">
                  Stuck in pending. It cannot be refunded from here yet (only orders in review can), so check it manually.
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}