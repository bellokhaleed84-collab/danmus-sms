"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import MobileNav from "@/components/MobileNav";
import API from "@/lib/api";
import { FaCopy } from "react-icons/fa6";

export default function StoreReceiptPage() {
  const { id } = useParams();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState("");

  useEffect(() => {
    async function load() {
      const token = localStorage.getItem("token");
      try {
        const res = await API.get(`/store/orders/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setOrder(res.data);
      } catch (e) {
        console.log(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(""), 2000);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex items-center justify-center">
        <p className="text-gray-400">Loading receipt...</p>
      </main>
    );
  }

  if (!order) {
    return (
      <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex items-center justify-center">
        <p className="text-gray-400">Order not found.</p>
      </main>
    );
  }

  const creds: any[] = order.credentials || [];
  const refunded = order.status === "failed" || order.status === "refunded";
  const processing = order.status === "review" || order.status === "pending";

  let badgeLabel = "Delivered";
  let badgeCls = "bg-green-600/20 text-green-400";
  if (processing) {
    badgeLabel = "Processing";
    badgeCls = "bg-yellow-600/20 text-yellow-400";
  } else if (refunded) {
    badgeLabel = "Refunded";
    badgeCls = "bg-gray-600/20 text-gray-300";
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-10 pb-28">
        <Link href="/marketplace/store/orders">
          <button className="text-gray-400 hover:text-white mb-6">{"\u2190"} Back to My Store Orders</button>
        </Link>

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-6 md:p-10 shadow-2xl">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="inline-block bg-blue-600/20 text-blue-400 text-xs font-bold px-3 py-1 rounded-full uppercase">
              {order.categoryName || "Store"}
            </span>
            <span className={`inline-block text-xs font-bold px-3 py-1 rounded-full uppercase ${badgeCls}`}>
              {badgeLabel}
            </span>
          </div>

          <h1 className="text-2xl md:text-4xl font-bold mt-4">{order.productName}</h1>

          <div className="bg-[var(--input)] border border-[var(--border)] rounded-2xl mt-6 divide-y divide-[var(--border)]">
            <div className="flex items-center justify-between p-5">
              <span className="text-gray-400 text-sm">Order Reference</span>
              <span className="font-bold break-all text-right">{String(order._id).toUpperCase()}</span>
            </div>
            <div className="flex items-center justify-between p-5">
              <span className="text-gray-400 text-sm">Date</span>
              <span className="font-bold text-right">{new Date(order.createdAt).toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between p-5">
              <span className="text-gray-400 text-sm">Quantity</span>
              <span className="font-bold">{order.quantity}</span>
            </div>
            <div className="flex items-center justify-between p-5">
              <span className="text-gray-400 text-sm">Amount</span>
              <span className="font-bold">
                {"\u20A6"}{Number(order.price).toLocaleString()}
              </span>
            </div>
          </div>

          {processing && (
            <div className="bg-yellow-600/10 border border-yellow-600/40 rounded-2xl p-5 mt-6">
              <p className="text-yellow-400 font-bold">Your order is being confirmed</p>
              <p className="text-gray-300 text-sm mt-2">
                This can take a few minutes. Refresh this page to check. If it can't be completed, your
                money is returned to your wallet.
              </p>
            </div>
          )}

          {refunded && (
            <div className="bg-gray-600/10 border border-gray-600/40 rounded-2xl p-5 mt-6">
              <p className="font-bold">This order was refunded</p>
              <p className="text-gray-300 text-sm mt-2">
                {"\u20A6"}{Number(order.price).toLocaleString()} has been returned to your wallet.
              </p>
            </div>
          )}

          {creds.length > 0 && (
            <div className="bg-green-600/10 border border-green-600/40 rounded-2xl p-6 mt-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-green-400 font-bold text-xl">Login Details</h3>
                {creds.length > 1 && (
                  <button
                    onClick={() => copy(creds.map((c) => c.details).join("\n"), "all")}
                    className="flex items-center gap-2 bg-[var(--card)] border border-[var(--border)] hover:border-blue-500 px-3 py-2 rounded-xl text-sm font-semibold transition"
                  >
                    <FaCopy /> {copied === "all" ? "Copied!" : "Copy all"}
                  </button>
                )}
              </div>

              {creds.map((c, i) => (
                <div key={i} className="bg-[var(--input)] border border-[var(--border)] rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-bold break-all">{c.details}</p>
                    <button
                      onClick={() => copy(c.details, `c${i}`)}
                      className="flex items-center gap-2 bg-[var(--card)] border border-[var(--border)] hover:border-blue-500 px-3 py-2 rounded-xl text-sm font-semibold transition shrink-0"
                    >
                      <FaCopy /> {copied === `c${i}` ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  {c.link && (
                    <a
                      href={c.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 text-sm break-all hover:underline mt-2 block"
                    >
                      {c.link}
                    </a>
                  )}
                </div>
              ))}

              <p className="text-yellow-400 text-sm">
                Change the password and recovery details immediately after logging in.
              </p>
            </div>
          )}
        </div>
      </div>

      <MobileNav />
    </main>
  );
}