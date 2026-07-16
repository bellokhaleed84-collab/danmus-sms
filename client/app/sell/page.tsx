"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import MobileNav from "@/components/MobileNav";
import API from "@/lib/api";

export default function SellListingPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    platform: "instagram",
    title: "",
    description: "",
    followers: "",
    accountAge: "",
    price: "",
    username: "",
    password: "",
    email: "",
    recoveryInfo: "",
  });
  const [loading, setLoading] = useState(false);

  function handleChange(e: any) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e: any) {
    e.preventDefault();
    setLoading(true);
    try {
      await API.post("/listings", {
        platform: form.platform,
        title: form.title,
        description: form.description,
        followers: Number(form.followers),
        accountAge: form.accountAge,
        price: Number(form.price),
        credentials: {
          username: form.username,
          password: form.password,
          email: form.email,
          recoveryInfo: form.recoveryInfo,
        },
      });
      alert("Listing submitted! It will appear once approved by an admin.");
      router.push("/marketplace");
    } catch (error: any) {
      alert(error?.response?.data?.message || "Failed to submit listing");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-10">
        <h1 className="text-2xl md:text-4xl font-bold mb-8">Sell an Account</h1>

        <form onSubmit={handleSubmit} className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-6 md:p-10 space-y-5">

          <div>
            <label className="block mb-2 font-semibold">Platform</label>
            <select
              name="platform"
              value={form.platform}
              onChange={handleChange}
              className="w-full bg-[var(--input)] border border-[var(--border)] rounded-2xl px-5 py-3 outline-none focus:border-blue-500"
            >
              <option value="instagram">Instagram</option>
              <option value="facebook">Facebook</option>
              <option value="tiktok">TikTok</option>
              <option value="twitter">Twitter/X</option>
              <option value="telegram">Telegram</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block mb-2 font-semibold">Title</label>
            <input
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="e.g. Instagram page - 10k followers, tech niche"
              required
              className="w-full bg-[var(--input)] border border-[var(--border)] rounded-2xl px-5 py-3 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block mb-2 font-semibold">Description</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={4}
              required
              className="w-full bg-[var(--input)] border border-[var(--border)] rounded-2xl px-5 py-3 outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block mb-2 font-semibold">Followers</label>
              <input
                name="followers"
                type="number"
                value={form.followers}
                onChange={handleChange}
                className="w-full bg-[var(--input)] border border-[var(--border)] rounded-2xl px-5 py-3 outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block mb-2 font-semibold">Account Age</label>
              <input
                name="accountAge"
                value={form.accountAge}
                onChange={handleChange}
                placeholder="e.g. 2 years"
                className="w-full bg-[var(--input)] border border-[var(--border)] rounded-2xl px-5 py-3 outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block mb-2 font-semibold">Price (₦)</label>
            <input
              name="price"
              type="number"
              value={form.price}
              onChange={handleChange}
              required
              className="w-full bg-[var(--input)] border border-[var(--border)] rounded-2xl px-5 py-3 outline-none focus:border-blue-500"
            />
          </div>

          <hr className="border-[var(--border)]" />

          <p className="text-sm text-gray-400">
            Account login details below are only revealed to the buyer after payment. Kept private until then.
          </p>

          <div>
            <label className="block mb-2 font-semibold">Username</label>
            <input
              name="username"
              value={form.username}
              onChange={handleChange}
              required
              className="w-full bg-[var(--input)] border border-[var(--border)] rounded-2xl px-5 py-3 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block mb-2 font-semibold">Password</label>
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              required
              className="w-full bg-[var(--input)] border border-[var(--border)] rounded-2xl px-5 py-3 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block mb-2 font-semibold">Recovery Email (optional)</label>
            <input
              name="email"
              value={form.email}
              onChange={handleChange}
              className="w-full bg-[var(--input)] border border-[var(--border)] rounded-2xl px-5 py-3 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block mb-2 font-semibold">Other Recovery Info (optional)</label>
            <input
              name="recoveryInfo"
              value={form.recoveryInfo}
              onChange={handleChange}
              className="w-full bg-[var(--input)] border border-[var(--border)] rounded-2xl px-5 py-3 outline-none focus:border-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 py-4 rounded-2xl font-bold transition disabled:opacity-50"
          >
            {loading ? "Submitting..." : "Submit Listing"}
          </button>
        </form>
      </div>

      <MobileNav />
    </main>
  );
}