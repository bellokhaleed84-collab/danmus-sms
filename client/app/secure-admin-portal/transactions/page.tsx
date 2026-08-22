"use client";

import { useEffect, useState } from "react";
import API from "@/lib/api";

export default function AdminTransactionsPage() {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [txFilter, setTxFilter] = useState("all");

  useEffect(() => {
    async function load() {
      const token = localStorage.getItem("token");
      try {
        const res = await API.get("/admin/transactions", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setTransactions(res.data);
      } catch (error) {
        console.log(error);
      }
      setLoading(false);
    }
    load();
  }, []);

  const filteredTransactions = transactions.filter(
    (t) => txFilter === "all" || t.type === txFilter
  );

  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="w-14 h-14 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
        <h1 className="text-xl font-bold">Loading transactions...</h1>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-4 mb-6 md:mb-8 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl md:text-4xl font-bold">Transactions</h1>
        <div className="flex gap-2 md:gap-3 overflow-x-auto pb-1 -mx-1 px-1 md:flex-wrap md:overflow-visible">
          {["all", "deposit", "sms_purchase", "marketplace_purchase"].map((f) => (
            <button
              key={f}
              onClick={() => setTxFilter(f)}
              className={`px-3 md:px-4 py-2 rounded-2xl text-xs md:text-sm font-semibold transition shrink-0 ${
                txFilter === f
                  ? "bg-blue-600 text-white"
                  : "bg-[var(--input)] border border-[var(--border)]"
              }`}
            >
              {f === "all"
                ? "All"
                : f === "deposit"
                ? "Deposits"
                : f === "sms_purchase"
                ? "SMS"
                : "Marketplace"}
            </button>
          ))}
        </div>
      </div>

      {filteredTransactions.length === 0 && (
        <div className="text-center text-gray-400 py-10 text-sm">
          No transactions found
        </div>
      )}

      <div className="space-y-3 md:space-y-4">
        {filteredTransactions.map((tx) => (
          <div
            key={tx._id}
            className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 md:p-5 flex items-start justify-between gap-3"
          >
            <div className="min-w-0">
              <p className="font-bold text-sm md:text-lg truncate">{tx.description || tx.type}</p>
              <p className="text-gray-400 text-xs md:text-sm mt-1 truncate">
                {tx.user?.name} — {tx.user?.email}
              </p>
              <p className="text-gray-500 text-[11px] md:text-xs mt-1">
                {new Date(tx.createdAt).toLocaleString()}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1.5 md:gap-2 shrink-0">
              <p className={`text-base md:text-xl font-bold whitespace-nowrap ${
                tx.type === "deposit" ? "text-green-500" : "text-blue-500"
              }`}>
                {tx.type === "deposit" ? "+" : "-"}₦{Number(tx.amount).toLocaleString()}
              </p>
              <div className={`px-2 md:px-3 py-1 rounded-xl text-[11px] md:text-xs font-semibold ${
                tx.status === "successful"
                  ? "bg-green-500/20 text-green-500"
                  : tx.status === "pending"
                  ? "bg-yellow-500/20 text-yellow-500"
                  : "bg-red-500/20 text-red-500"
              }`}>
                {tx.status}
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}