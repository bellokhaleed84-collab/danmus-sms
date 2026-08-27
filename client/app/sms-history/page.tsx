"use client";

import { useEffect, useState } from "react";
import API from "@/lib/api";
import Link from "next/link";
import MobileNav from "@/components/MobileNav";
import {
  FaInstagram,
  FaFacebook,
  FaTiktok,
  FaXTwitter,
  FaTelegram,
  FaWhatsapp,
  FaLink,
  FaSnapchat,
  FaEnvelope,
  FaMicrosoft,
  FaApple,
  FaFilm,
  FaMusic,
  FaReddit,
  FaDiscord,
  FaLinkedin,
  FaComments,
  FaShieldHalved,
  FaVideo,
  FaMessage,
  FaCartShopping,
} from "react-icons/fa6";

const platformIcons: any = {
  instagram: <FaInstagram className="text-pink-500" />,
  facebook: <FaFacebook className="text-blue-500" />,
  tiktok: <FaTiktok className="text-white" />,
  twitter: <FaXTwitter className="text-white" />,
  telegram: <FaTelegram className="text-sky-400" />,
  whatsapp: <FaWhatsapp className="text-green-500" />,
  piavpn: <FaShieldHalved className="text-orange-400" />,
  snapchat: <FaSnapchat className="text-yellow-400" />,
  mailcom: <FaEnvelope className="text-gray-400" />,
  outlook: <FaMicrosoft className="text-blue-400" />,
  netflix: <FaFilm className="text-red-500" />,
  appleid: <FaApple className="text-gray-300" />,
  moviebox: <FaVideo className="text-purple-400" />,
  applemusic: <FaMusic className="text-pink-400" />,
  reddit: <FaReddit className="text-orange-500" />,
  discord: <FaDiscord className="text-indigo-400" />,
  linkedin: <FaLinkedin className="text-blue-500" />,
  textplus: <FaComments className="text-green-400" />,
  hotspotshield: <FaShieldHalved className="text-green-400" />,
  nordvpn: <FaShieldHalved className="text-blue-400" />,
  surfshark: <FaShieldHalved className="text-teal-400" />,
  expressvpn: <FaShieldHalved className="text-red-400" />,
  other: <FaLink className="text-gray-400" />,
};

/* ---------- shared receipt shape ---------- */
type Receipt = {
  id: string;
  type: "sms" | "purchase";
  icon: React.ReactNode;
  title: string;      // service name or purchase title
  subtitle: string;   // country or platform
  detail: string;     // phone number or price
  status: "Completed" | "Pending";
  date: string;
  href: string;        // where clicking the row takes you
};

export default function SmsHistoryPage() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);

  /* FETCH SMS HISTORY + PURCHASES TOGETHER */
  useEffect(() => {
    async function fetchAll() {
      const token = localStorage.getItem("token");

      const [smsRes, purchaseRes] = await Promise.allSettled([
        API.get("/sms/history"),
        API.get("/listings/my-purchases", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const smsReceipts: Receipt[] =
        smsRes.status === "fulfilled"
          ? smsRes.value.data.map((sms: any) => ({
              id: sms._id,
              type: "sms" as const,
              icon: <FaMessage className="text-blue-400" />,
              title: sms.service,
              subtitle: sms.country,
              detail: sms.phone,
              status: sms.otp ? "Completed" : "Pending",
              date: sms.createdAt,
              href: `/sms-history/${sms._id}`,
            }))
          : [];

      const purchaseReceipts: Receipt[] =
        purchaseRes.status === "fulfilled"
          ? purchaseRes.value.data.map((p: any) => ({
              id: p._id,
              type: "purchase" as const,
              icon: platformIcons[p.platform] || <FaCartShopping className="text-purple-400" />,
              title: p.title,
              subtitle: p.platform,
              detail: `₦${Number(p.price).toLocaleString()}`,
              status: "Completed",
              date: p.createdAt,
              href: `/my-purchases/${p._id}`,
            }))
          : [];

      const merged = [...smsReceipts, ...purchaseReceipts].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      setReceipts(merged);
      setLoading(false);
    }

    fetchAll();
  }, []);

  /* STATS */
  const totalOrders = receipts.length;
  const completedOrders = receipts.filter((r) => r.status === "Completed").length;
  const pendingOrders = receipts.filter((r) => r.status === "Pending").length;

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] transition-all duration-300 pb-28 md:pb-0 overflow-x-hidden">
      {/* BACKGROUND EFFECTS */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 left-0 w-72 md:w-96 h-72 md:h-96 bg-blue-500/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 right-0 w-72 md:w-96 h-72 md:h-96 bg-purple-500/20 blur-[120px] rounded-full" />
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-10">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 mb-10">
          <div>
            <h1 className="text-3xl md:text-5xl font-bold">History</h1>
            <p className="text-gray-400 mt-3 text-sm md:text-lg">
              All your OTP orders and marketplace purchases in one place
            </p>
          </div>

          <Link href="/dashboard">
            <button
              title="Back Dashboard"
              className="bg-blue-600 hover:bg-blue-700 px-5 md:px-6 py-3 rounded-2xl font-semibold transition shadow-xl"
            >
              Back Dashboard
            </button>
          </Link>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-10">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl md:rounded-3xl p-5 md:p-8 shadow-xl">
            <p className="text-gray-400 text-sm md:text-base">Total Orders</p>
            <h2 className="text-3xl md:text-5xl font-bold mt-4">{totalOrders}</h2>
          </div>

          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl md:rounded-3xl p-5 md:p-8 shadow-xl">
            <p className="text-gray-400 text-sm md:text-base">Completed</p>
            <h2 className="text-3xl md:text-5xl font-bold mt-4 text-green-500">
              {completedOrders}
            </h2>
          </div>

          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl md:rounded-3xl p-5 md:p-8 shadow-xl">
            <p className="text-gray-400 text-sm md:text-base">Pending</p>
            <h2 className="text-3xl md:text-5xl font-bold mt-4 text-yellow-500">
              {pendingOrders}
            </h2>
          </div>
        </div>

        {/* TABLE */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-[28px] md:rounded-[32px] shadow-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px]">
              <thead className="bg-[var(--input)]">
                <tr>
                  <th className="text-left p-5 md:p-6">Type</th>
                  <th className="text-left p-5 md:p-6">Service / Item</th>
                  <th className="text-left p-5 md:p-6">Country / Platform</th>
                  <th className="text-left p-5 md:p-6">Number / Price</th>
                  <th className="text-left p-5 md:p-6">Status</th>
                  <th className="text-left p-5 md:p-6">Date</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-10 text-center text-gray-400">
                      Loading...
                    </td>
                  </tr>
                ) : receipts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-10 text-center text-gray-400">
                      No history yet
                    </td>
                  </tr>
                ) : (
                  receipts.map((r) => (
                    <tr
                      key={`${r.type}-${r.id}`}
                      onClick={() => (window.location.href = r.href)}
                      className="border-t border-[var(--border)] hover:bg-[var(--input)] transition cursor-pointer"
                    >
                      <td className="p-5 md:p-6 text-xl">{r.icon}</td>

                      <td className="p-5 md:p-6 font-semibold">{r.title}</td>

                      <td className="p-5 md:p-6">{r.subtitle}</td>

                      <td className="p-5 md:p-6 font-bold tracking-widest">
                        {r.detail || "—"}
                      </td>

                      <td className="p-5 md:p-6">
                        <span
                          className={`px-4 py-2 rounded-xl text-sm font-semibold ${
                            r.status === "Completed"
                              ? "bg-green-500/20 text-green-500"
                              : "bg-yellow-500/20 text-yellow-500"
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>

                      <td className="p-5 md:p-6 text-gray-400">
                        {new Date(r.date).toLocaleDateString()}
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