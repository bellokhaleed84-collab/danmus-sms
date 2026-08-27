"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import MobileNav from "@/components/MobileNav";
import API from "@/lib/api";

export default function SmsReceiptPage() {
  const { id } = useParams();
  const [sms, setSms] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await API.get("/sms/history");
        const found = res.data.find((s: any) => s._id === id);
        setSms(found || null);
      } catch (error) {
        console.log(error);
      }
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex items-center justify-center">
        <p className="text-gray-400">Loading receipt...</p>
      </main>
    );
  }

  if (!sms) {
    return (
      <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400">SMS order not found.</p>
          <Link href="/sms-history">
            <button className="text-blue-400 hover:underline mt-4">← Back to SMS History</button>
          </Link>
        </div>
      </main>
    );
  }

  const orderRef = String(sms._id).toUpperCase();

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-10">
        <Link href="/sms-history">
          <button className="text-gray-400 hover:text-white mb-6">← Back to SMS History</button>
        </Link>

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-6 md:p-10 shadow-2xl">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="inline-block bg-blue-600/20 text-blue-400 text-xs font-bold px-3 py-1 rounded-full uppercase">
              {sms.service}
            </span>
            <span
              className={`px-4 py-2 rounded-full text-xs font-bold uppercase ${
                sms.otp ? "bg-green-500/20 text-green-500" : "bg-yellow-500/20 text-yellow-500"
              }`}
            >
              {sms.otp ? "Completed" : "Pending"}
            </span>
          </div>

          <h1 className="text-2xl md:text-4xl font-bold mt-4">
            {sms.service} — {sms.country}
          </h1>

          {/* ── Receipt details ── */}
          <div className="bg-[var(--input)] border border-[var(--border)] rounded-2xl mt-6 divide-y divide-[var(--border)]">
            <div className="flex items-center justify-between p-5">
              <span className="text-gray-400 text-sm">Order Reference</span>
              <span className="font-bold break-all text-right">{orderRef}</span>
            </div>
            <div className="flex items-center justify-between p-5">
              <span className="text-gray-400 text-sm">Service</span>
              <span className="font-bold text-right">{sms.service}</span>
            </div>
            <div className="flex items-center justify-between p-5">
              <span className="text-gray-400 text-sm">Country</span>
              <span className="font-bold text-right">{sms.country}</span>
            </div>
            <div className="flex items-center justify-between p-5">
              <span className="text-gray-400 text-sm">Phone Number</span>
              <span className="font-bold text-right">{sms.phone}</span>
            </div>
            <div className="flex items-center justify-between p-5">
              <span className="text-gray-400 text-sm">OTP Code</span>
              <span className="font-bold tracking-widest text-right">{sms.otp || "—"}</span>
            </div>
            {sms.price !== undefined && (
              <div className="flex items-center justify-between p-5">
                <span className="text-gray-400 text-sm">Amount</span>
                <span className="font-bold text-right">₦{Number(sms.price).toLocaleString()}</span>
              </div>
            )}
            <div className="flex items-center justify-between p-5">
              <span className="text-gray-400 text-sm">Date</span>
              <span className="font-bold text-right">
                {sms.createdAt ? new Date(sms.createdAt).toLocaleString() : "—"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <MobileNav />
    </main>
  );
}