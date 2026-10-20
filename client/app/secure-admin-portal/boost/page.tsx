"use client";

import { useEffect, useState } from "react";
import API from "@/lib/api";

const STATUS_STYLE: Record<string, string> = {
  completed: "bg-green-500/20 text-green-500",
  pending: "bg-yellow-500/20 text-yellow-500",
  in_progress: "bg-yellow-500/20 text-yellow-500",
  partial: "bg-orange-500/20 text-orange-400",
  canceled: "bg-red-500/20 text-red-500",
  failed: "bg-red-500/20 text-red-500",
  refunded: "bg-blue-500/20 text-blue-400",
};

export default function AdminBoostPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({ byStatus: {}, revenue: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const token = localStorage.getItem("token");
      try {
        const res = await API.get("/admin/boost/orders", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setOrders(res.data.orders || []);
        setSummary(res.data.summary || { byStatus: {}, revenue: 0 });
      } catch (e: any) {
        setError(e?.response?.data?.message || "Could not load boost orders");
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="w-14 h-14 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
        <h1 className="text-xl font-bold">Loading boost orders...</h1>
      </div>
    );
  }

  const by = summary.byStatus || {};
  const total = Object.values(by).reduce((s: number, n: any) => s + Number(n), 0);

  return (
    <>
      <h1 className="text-2xl md:text-4xl font-bold mb-8">Boost Orders</h1>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-2xl p-4 mb-6 text-sm">{error}</div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-8">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 md:p-6 shadow-xl">
          <p className="text-gray-400 text-xs md:text-sm">Total orders</p>
          <h3 className="text-xl md:text-4xl font-bold mt-2">{total}</h3>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 md:p-6 shadow-xl">
          <p className="text-gray-400 text-xs md:text-sm">Completed</p>
          <h3 className="text-xl md:text-4xl font-bold mt-2 text-green-500">{by.completed || 0}</h3>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 md:p-6 shadow-xl">
          <p className="text-gray-400 text-xs md:text-sm">Pending / in progress</p>
          <h3 className="text-xl md:text-4xl font-bold mt-2 text-yellow-500">
            {(by.pending || 0) + (by.in_progress || 0)}
          </h3>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 md:p-6 shadow-xl">
          <p className="text-gray-400 text-xs md:text-sm">Revenue (excl. failed/refunded)</p>
          <h3 className="text-lg md:text-3xl font-bold mt-2 text-green-500 truncate">
            {"\u20A6"}{Number(summary.revenue || 0).toLocaleString()}
          </h3>
        </div>
      </div>

      {orders.length === 0 && <div className="text-center text-gray-400 py-10 text-sm">No boost orders yet</div>}

      <div className="space-y-3 md:space-y-4">
        {orders.map((o) => (
          <div
            key={o._id}
            className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 md:p-5 flex items-start justify-between gap-3"
          >
            <div className="min-w-0">
              <p className="font-bold text-sm md:text-lg truncate">{o.serviceName || "Boost"}</p>
              <p className="text-gray-400 text-xs md:text-sm mt-1 truncate">
                {o.user?.name} {"\u2014"} {o.user?.email}
              </p>
              <p className="text-gray-500 text-[11px] md:text-xs mt-1 truncate">
                {o.category} {"\u00B7"} qty {o.quantity} {"\u00B7"} {o.link}
              </p>
              <p className="text-gray-500 text-[11px] md:text-xs mt-1">{new Date(o.createdAt).toLocaleString()}</p>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <p className="text-base md:text-xl font-bold whitespace-nowrap text-blue-500">
                {"\u20A6"}{Number(o.price).toLocaleString()}
              </p>
              <span
                className={`px-2 md:px-3 py-1 rounded-xl text-[11px] md:text-xs font-semibold ${
                  STATUS_STYLE[o.status] || "bg-gray-500/20 text-gray-400"
                }`}
              >
                {o.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}