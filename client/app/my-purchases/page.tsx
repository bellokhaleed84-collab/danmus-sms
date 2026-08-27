"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import MobileNav from "@/components/MobileNav";
import API from "@/lib/api";
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

export default function MyPurchasesPage() {
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPurchases() {
      const token = localStorage.getItem("token");
      try {
        const res = await API.get(`/listings/my-purchases`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setPurchases(res.data);
      } catch (error) {
        console.log(error);
      } finally {
        setLoading(false);
      }
    }
    fetchPurchases();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex items-center justify-center">
        <p className="text-gray-400">Loading purchases...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-10">
        <Link href="/marketplace">
          <button className="text-gray-400 hover:text-white mb-6">← Back to Marketplace</button>
        </Link>

        <h1 className="text-2xl md:text-3xl font-bold mb-6">My Purchases</h1>

        {purchases.length === 0 ? (
          <p className="text-gray-400">You haven't bought anything yet.</p>
        ) : (
          <div className="space-y-4">
            {purchases.map((p) => (
              <Link key={p._id} href={`/my-purchases/${p._id}`}>
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 flex items-center justify-between hover:border-blue-500 transition cursor-pointer">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">
                      {platformIcons[p.platform] || platformIcons.other}
                    </span>
                    <div>
                      <p className="font-bold">{p.title}</p>
                      <p className="text-gray-400 text-sm uppercase">{p.platform}</p>
                    </div>
                  </div>
                  <span className="font-bold">₦{Number(p.price).toLocaleString()}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <MobileNav />
    </main>
  );
}