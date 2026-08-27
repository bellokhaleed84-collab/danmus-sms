"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
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
  FaCopy,
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

export default function PurchaseReceiptPage() {
  const { id } = useParams();
  const [listing, setListing] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [creds, setCreds] = useState<any>(null);
  const [credsLoading, setCredsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchListing() {
      try {
        const res = await API.get(`/listings/${id}`);
        setListing(res.data);
      } catch (error) {
        console.log(error);
      } finally {
        setLoading(false);
      }
    }
    fetchListing();
  }, [id]);

  async function handleViewDetails() {
    if (creds) return; // already revealed this session
    const token = localStorage.getItem("token");
    setCredsLoading(true);
    try {
      const res = await API.get(`/listings/${id}/credentials`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCreds(res.data.credentials);
    } catch (error: any) {
      alert(error.response?.data?.message || "Failed to load login details");
    }
    setCredsLoading(false);
  }

  function handleCopyAll() {
    if (!creds) return;
    const lines = [
      `Username: ${creds.username}`,
      `Password: ${creds.password}`,
      creds.email ? `Recovery Email: ${creds.email}` : null,
      creds.recoveryInfo ? `Recovery Info: ${creds.recoveryInfo}` : null,
    ].filter(Boolean);
    navigator.clipboard.writeText(lines.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex items-center justify-center">
        <p className="text-gray-400">Loading receipt...</p>
      </main>
    );
  }

  if (!listing) {
    return (
      <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex items-center justify-center">
        <p className="text-gray-400">Purchase not found.</p>
      </main>
    );
  }

  const orderRef = String(listing._id).toUpperCase();

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-10">
        <Link href="/my-purchases">
          <button className="text-gray-400 hover:text-white mb-6">← Back to My Purchases</button>
        </Link>

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-6 md:p-10 shadow-2xl">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-3xl">
                {platformIcons[listing.platform] || platformIcons.other}
              </span>
              <span className="inline-block bg-blue-600/20 text-blue-400 text-xs font-bold px-3 py-1 rounded-full uppercase">
                {listing.platform}
              </span>
            </div>
            <span className="inline-block bg-green-600/20 text-green-400 text-xs font-bold px-3 py-1 rounded-full uppercase">
              Purchase Successful
            </span>
          </div>

          <h1 className="text-2xl md:text-4xl font-bold mt-4">{listing.title}</h1>
          {listing.description && (
            <p className="text-gray-400 mt-3 leading-relaxed">{listing.description}</p>
          )}

          {listing.previewLink && (
            <div className="bg-[var(--input)] rounded-2xl p-5 mt-6">
              <p className="text-gray-400 text-sm">Link</p>
              <a
                href={listing.previewLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 font-semibold break-all hover:underline mt-1 block"
              >
                {listing.previewLink}
              </a>
            </div>
          )}

          {/* ── Receipt details ── */}
          <div className="bg-[var(--input)] border border-[var(--border)] rounded-2xl mt-6 divide-y divide-[var(--border)]">
            <div className="flex items-center justify-between p-5">
              <span className="text-gray-400 text-sm">Order Reference</span>
              <span className="font-bold break-all text-right">{orderRef}</span>
            </div>
            <div className="flex items-center justify-between p-5">
              <span className="text-gray-400 text-sm">Purchased At</span>
              <span className="font-bold text-right">
                {listing.soldAt ? new Date(listing.soldAt).toLocaleString() : "—"}
              </span>
            </div>
            <div className="flex items-center justify-between p-5">
              <span className="text-gray-400 text-sm">Quantity</span>
              <span className="font-bold">1</span>
            </div>
            <div className="flex items-center justify-between p-5">
              <span className="text-gray-400 text-sm">Amount</span>
              <span className="font-bold">₦{Number(listing.price).toLocaleString()}</span>
            </div>
          </div>

          {/* ── Login details, revealed on demand ── */}
          <div className="mt-6">
            {!creds ? (
              <button
                onClick={handleViewDetails}
                disabled={credsLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 py-5 rounded-2xl font-bold text-lg transition disabled:opacity-50"
              >
                {credsLoading ? "Loading..." : "View Login Details"}
              </button>
            ) : (
              <div className="bg-green-600/10 border border-green-600/40 rounded-2xl p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-green-400 font-bold text-xl">Account Login Details</h3>
                  <button
                    onClick={handleCopyAll}
                    className="flex items-center gap-2 bg-[var(--card)] border border-[var(--border)] hover:border-blue-500 px-3 py-2 rounded-xl text-sm font-semibold transition"
                  >
                    <FaCopy /> {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
                <p><span className="text-gray-400">Username:</span> <span className="font-bold">{creds.username}</span></p>
                <p><span className="text-gray-400">Password:</span> <span className="font-bold">{creds.password}</span></p>
                {creds.email && (
                  <p><span className="text-gray-400">Recovery Email:</span> <span className="font-bold">{creds.email}</span></p>
                )}
                {creds.recoveryInfo && (
                  <p><span className="text-gray-400">Recovery Info:</span> <span className="font-bold">{creds.recoveryInfo}</span></p>
                )}
                <p className="text-yellow-400 text-sm mt-4">
                  ⚠️ Change the password and recovery email immediately after logging in.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <MobileNav />
    </main>
  );
}