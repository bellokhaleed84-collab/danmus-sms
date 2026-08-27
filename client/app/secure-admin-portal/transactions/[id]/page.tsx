"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import API from "@/lib/api";

export default function AdminTransactionReceiptPage() {
  const { id } = useParams();
  const [tx, setTx] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const token = localStorage.getItem("token");
      try {
        const res = await API.get("/admin/transactions", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const found = res.data.find((t: any) => t._id === id);
        setTx(found || null);
      } catch (error) {
        console.log(error);
      }
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="w-14 h-14 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
        <h1 className="text-xl font-bold">Loading receipt...</h1>
      </div>
    );
  }

  if (!tx) {
    return (
      <div className="text-center py-20">
        <h1 className="text-xl font-bold">Transaction not found.</h1>
        <Link href="/secure-admin-portal/transactions">
          <button className="text-blue-400 hover:underline mt-4">← Back to Transactions</button>
        </Link>
      </div>
    );
  }

  const orderRef = String(tx._id).toUpperCase();

  return (
    <div className="max-w-3xl mx-auto">
      <Link href="/secure-admin-portal/transactions">
        <button className="text-gray-400 hover:text-white mb-6">← Back to Transactions</button>
      </Link>

      <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-6 md:p-10 shadow-2xl">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="inline-block bg-blue-600/20 text-blue-400 text-xs font-bold px-3 py-1 rounded-full uppercase">
            {tx.type.replace("_", " ")}
          </span>
          <div
            className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
              tx.status === "successful"
                ? "bg-green-500/20 text-green-500"
                : tx.status === "pending"
                ? "bg-yellow-500/20 text-yellow-500"
                : "bg-red-500/20 text-red-500"
            }`}
          >
            {tx.status}
          </div>
        </div>

        <h1 className="text-2xl md:text-4xl font-bold mt-4">{tx.description || tx.type}</h1>

        {/* ── User info ── */}
        <div className="bg-[var(--input)] rounded-2xl p-5 mt-6">
          <p className="text-gray-400 text-sm">User</p>
          <p className="font-bold mt-1">{tx.user?.name || "—"}</p>
          <p className="text-gray-400 text-sm mt-1">{tx.user?.email || "—"}</p>
          {tx.user?._id && (
            <p className="text-gray-500 text-xs mt-2">User ID: {tx.user._id}</p>
          )}
        </div>

        {/* ── Receipt details ── */}
        <div className="bg-[var(--input)] border border-[var(--border)] rounded-2xl mt-6 divide-y divide-[var(--border)]">
          <div className="flex items-center justify-between p-5">
            <span className="text-gray-400 text-sm">Reference</span>
            <span className="font-bold break-all text-right">{orderRef}</span>
          </div>
          <div className="flex items-center justify-between p-5">
            <span className="text-gray-400 text-sm">Type</span>
            <span className="font-bold capitalize text-right">{tx.type.replace("_", " ")}</span>
          </div>
          <div className="flex items-center justify-between p-5">
            <span className="text-gray-400 text-sm">Date</span>
            <span className="font-bold text-right">
              {tx.createdAt ? new Date(tx.createdAt).toLocaleString() : "—"}
            </span>
          </div>
          <div className="flex items-center justify-between p-5">
            <span className="text-gray-400 text-sm">Status</span>
            <span className="font-bold capitalize text-right">{tx.status}</span>
          </div>
          <div className="flex items-center justify-between p-5">
            <span className="text-gray-400 text-sm">Amount</span>
            <span
              className={`font-bold text-lg ${
                tx.type === "deposit" ? "text-green-500" : "text-blue-500"
              }`}
            >
              {tx.type === "deposit" ? "+" : "-"}₦{Number(tx.amount).toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}