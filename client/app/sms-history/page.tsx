"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import MobileNav from "@/components/MobileNav";
import API from "@/lib/api";

export default function SmsHistoryPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      const token = localStorage.getItem("token");
      if (!token) { setLoading(false); return; }
      try {
        const response = await API.get("/wallet/transactions", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const smsOnly = (response.data || []).filter(
          (t: any) => t.type === "sms_purchase"
        );
        setTransactions(smsOnly);
      } catch (error) {
        console.log(error);
      }
      setLoading(false);
    }
    fetchHistory();
  }, []);

  const totalOrders = transactions.length;
  const completedOrders = transactions.filter((t) => t.status === "successful").length;
  const pendingOrders = transactions.filter((t) => t.status === "pending").length;

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] transition-all duration-300 pb-28 md:pb-0 overflow-x-hidden">
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 left-0 w-72 md:w-96 h-72 md:h-96 bg-blue-500/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 right-0 w-72 md:w-96 h-72 md:h-96 bg-purple-500/20 blur-[120px] rounded-full" />
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 mb-10">
          <div>
            <h1 className="text-3xl md:text-5xl font-bold">SMS History</h1>
            <p className="text-gray-400 mt-3 text-sm md:text-lg">View all your OTP and SMS activities</p>
          </div>
          <Link href="/dashboard">
            <button className="bg-blue-600 hover:bg-blue-700 px-5 md:px-6 py-3 rounded-2xl font-semibold transition shadow-xl">
              Back Dashboard
            </button>
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-10">
          {[
            { label: "Total Orders", value: totalOrders, color: "text-white" },
            { label: "Completed", value: completedOrders, color: "text-green-500" },
            { label: "Pending", value: pendingOrders, color: "text-yellow-500" },
          ].map((stat) => (
            <div key={stat.label} className="bg-[var(--card)] border border-[var(--border)] rounded-2xl md:rounded-3xl p-5 md:p-8 shadow-xl">
              <p className="text-gray-400 text-sm md:text-base">{stat.label}</p>
              <h2 className={`text-3xl md:text-5xl font-bold mt-4 ${stat.color}`}>{stat.value}</h2>
            </div>
          ))}
        </div>

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-[28px] md:rounded-[32px] shadow-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead className="bg-[var(--input)]">
                <tr>
                  {["Description", "Amount", "Status", "Date"].map((h) => (
                    <th key={h} className="text-left p-5 md:p-6">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4} className="p-10 text-center text-gray-400">Loading...</td></tr>
                ) : transactions.length === 0 ? (
                  <tr><td colSpan={4} className="p-10 text-center text-gray-400">No SMS history yet</td></tr>
                ) : (
                  transactions.map((tx) => (
                    <tr key={tx._id} className="border-t border-[var(--border)] hover:bg-[var(--input)] transition">
                      <td className="p-5 md:p-6 font-semibold">{tx.description}</td>
                      <td className="p-5 md:p-6 font-bold text-red-400">
                        ₦{Number(tx.amount).toLocaleString()}
                      </td>
                      <td className="p-5 md:p-6">
                        <span className={`px-4 py-2 rounded-xl text-sm font-semibold ${
                          tx.status === "successful" ? "bg-green-500/20 text-green-500" :
                          tx.status === "pending" ? "bg-yellow-500/20 text-yellow-500" :
                          "bg-red-500/20 text-red-500"}`}>
                          {tx.status}
                        </span>
                      </td>
                      <td className="p-5 md:p-6 text-gray-400">
                        {new Date(tx.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <MobileNav />
    </main>
  );
}