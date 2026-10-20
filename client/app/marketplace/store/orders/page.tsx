"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import MobileNav from "@/components/MobileNav";
import API from "@/lib/api";

function statusBadge(status: string) {
  switch (status) {
    case "completed":
      return { label: "Delivered", cls: "bg-green-600/20 text-green-400" };
    case "review":
    case "pending":
      return { label: "Processing", cls: "bg-yellow-600/20 text-yellow-400" };
    case "failed":
    case "refunded":
      return { label: "Refunded", cls: "bg-gray-600/20 text-gray-300" };
    default:
      return { label: status, cls: "bg-gray-600/20 text-gray-300" };
  }
}

export default function StoreOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const token = localStorage.getItem("token");
      try {
        const res = await API.get("/store/orders/mine", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setOrders(res.data);
      } catch (e: any) {
        setError(e.response?.data?.message || "Could not load your orders.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex items-center justify-center">
        <p className="text-gray-400">Loading orders...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-10 pb-28">
        <Link href="/marketplace/store">
          <button className="text-gray-400 hover:text-white mb-6">{"\u2190"} Back to Store</button>
        </Link>

        <h1 className="text-2xl md:text-3xl font-bold mb-6">My Store Orders</h1>

        {error && <p className="text-red-400 mb-4">{error}</p>}

        {orders.length === 0 ? (
          <p className="text-gray-400">You haven't bought anything from the store yet.</p>
        ) : (
          <div className="space-y-4">
            {orders.map((o) => {
              const b = statusBadge(o.status);
              return (
                <Link key={o._id} href={`/marketplace/store/orders/${o._id}`}>
                  <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 flex items-center justify-between hover:border-blue-500 transition cursor-pointer">
                    <div>
                      <p className="font-bold">
                        {o.productName} {o.quantity > 1 ? `x${o.quantity}` : ""}
                      </p>
                      <p className="text-gray-400 text-sm mt-1">
                        {new Date(o.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">
                        {"\u20A6"}{Number(o.price).toLocaleString()}
                      </p>
                      <span className={`inline-block text-xs font-bold px-3 py-1 rounded-full mt-1 ${b.cls}`}>
                        {b.label}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <MobileNav />
    </main>
  );
}