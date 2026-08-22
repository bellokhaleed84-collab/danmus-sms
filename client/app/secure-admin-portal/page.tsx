
"use client";

import { useEffect, useState } from "react";
import API from "@/lib/api";

export default function AdminOverviewPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalRevenue: 0,
    totalTransactions: 0,
    totalWalletBalance: 0,
    estimatedProfit: 0,
    mostUsedProvider: null as any,
    providerBreakdown: [] as any[],
  });

  useEffect(() => {
    async function loadStats() {
      const token = localStorage.getItem("token");
      try {
        const res = await API.get("/admin/stats", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setStats(res.data);
      } catch (error) {
        console.log(error);
      }
      setLoading(false);
    }
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="w-14 h-14 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
        <h1 className="text-xl font-bold">Loading overview...</h1>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-2xl md:text-4xl font-bold mb-8">Overview</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-8">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl md:rounded-3xl p-4 md:p-8 shadow-xl">
          <p className="text-gray-400 text-xs md:text-base">Total Users</p>
          <h2 className="text-xl md:text-5xl font-bold mt-2 md:mt-4">{stats.totalUsers}</h2>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl md:rounded-3xl p-4 md:p-8 shadow-xl">
          <p className="text-gray-400 text-xs md:text-base">Total Transactions</p>
          <h2 className="text-xl md:text-5xl font-bold mt-2 md:mt-4 text-blue-500">{stats.totalTransactions}</h2>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl md:rounded-3xl p-4 md:p-8 shadow-xl">
          <p className="text-gray-400 text-xs md:text-base">Total Deposited (Revenue)</p>
          <h2 className="text-xl md:text-5xl font-bold mt-2 md:mt-4 text-green-500 truncate">
            ₦{Number(stats.totalRevenue).toLocaleString()}
          </h2>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl md:rounded-3xl p-4 md:p-8 shadow-xl">
          <p className="text-gray-400 text-xs md:text-base">Platform Status</p>
          <h2 className="text-xl md:text-5xl font-bold mt-2 md:mt-4 text-yellow-500">LIVE</h2>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4 md:gap-6 mb-8">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl md:rounded-3xl p-5 md:p-8 shadow-xl text-white">
          <p className="opacity-80 text-sm md:text-base">Total Balance Across All Users</p>
          <h2 className="text-2xl md:text-4xl font-bold mt-3">
            ₦{Number(stats.totalWalletBalance).toLocaleString()}
          </h2>
          <p className="opacity-70 text-xs mt-2">Money currently sitting in user wallets (not yours yet)</p>
        </div>
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl md:rounded-3xl p-5 md:p-8 shadow-xl text-white">
          <p className="opacity-80 text-sm md:text-base">Estimated Profit (SMS Sales)</p>
          <h2 className="text-2xl md:text-4xl font-bold mt-3">
            ₦{Number(stats.estimatedProfit).toLocaleString()}
          </h2>
          <p className="opacity-70 text-xs mt-2">Your ~80% markup share of what SMS providers actually charge</p>
        </div>
      </div>

      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl md:rounded-3xl p-5 md:p-8 shadow-xl">
        <h2 className="text-lg md:text-2xl font-bold mb-5">Provider Usage</h2>

        {stats.mostUsedProvider ? (
          <div className="bg-blue-600/10 border border-blue-500/30 rounded-2xl p-4 mb-5">
            <p className="text-gray-400 text-xs md:text-sm">Most Used Provider</p>
            <p className="text-blue-400 font-bold text-lg md:text-xl mt-1">
              {stats.mostUsedProvider.label} — {stats.mostUsedProvider.count} orders
            </p>
          </div>
        ) : (
          <p className="text-gray-400 text-sm mb-5">No SMS purchases yet</p>
        )}

        {stats.providerBreakdown.length > 0 && (
          <div className="space-y-3">
            {stats.providerBreakdown.map((p) => (
              <div
                key={p.key}
                className="flex items-center justify-between bg-[var(--input)] border border-[var(--border)] rounded-xl px-4 py-3"
              >
                <p className="font-semibold text-sm md:text-base">{p.label}</p>
                <p className="text-gray-400 text-sm">{p.count} orders</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}