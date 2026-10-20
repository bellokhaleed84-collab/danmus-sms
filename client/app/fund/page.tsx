"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import MobileNav from "@/components/MobileNav";
import API from "@/lib/api";

const QUICK = [500, 1000, 2000, 5000];

export default function FundPage() {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function pay(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!localStorage.getItem("token")) return router.push("/login");
    setLoading(true);
    try {
      const { data } = await API.post("/squad/initialize", { amount: Number(amount) });
      sessionStorage.setItem("squad_ref", data.reference);
      window.location.href = data.checkoutUrl;
    } catch (err: any) {
      setError(err?.response?.data?.message || "Could not start payment");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] transition-all duration-300">
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/20 blur-[120px] rounded-full" />
      </div>

      <div className="max-w-xl mx-auto px-4 md:px-6 py-6 md:py-10">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-2xl md:text-5xl font-bold">Add Funds</h1>
            <p className="text-gray-400 mt-3 text-lg">Fund your wallet instantly</p>
          </div>
          <Link href="/wallet">
            <button className="bg-blue-600 hover:bg-blue-700 px-4 md:px-6 py-3 rounded-2xl font-semibold transition shadow-xl">
              Back
            </button>
          </Link>
        </div>

        <form
          onSubmit={pay}
          className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-8 shadow-xl space-y-6"
        >
          <div>
            <label className="block text-gray-400 mb-2">Amount (₦)</label>
            <input
              type="number"
              min={100}
              max={500000}
              step={1}
              placeholder="Minimum ₦100"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-[var(--input)] border border-[var(--border)] rounded-2xl px-5 py-4 outline-none focus:border-blue-500 transition"
              required
            />
          </div>

          <div className="flex flex-wrap gap-3">
            {QUICK.map((q) => (
              <button
                type="button"
                key={q}
                onClick={() => setAmount(String(q))}
                className="bg-[var(--input)] border border-[var(--border)] hover:border-blue-500 px-4 py-2 rounded-2xl text-sm transition"
              >
                ₦{q.toLocaleString()}
              </button>
            ))}
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-2xl py-4 font-semibold transition shadow-xl"
          >
            {loading ? "Redirecting to Squad…" : "Pay securely with Squad"}
          </button>
        </form>
      </div>

      <MobileNav />
    </main>
  );
}