"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import MobileNav from "@/components/MobileNav";

export default function WalletPage() {
  const [balance, setBalance] = useState(0);

useEffect(() => {

  async function fetchWallet() {

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data } = await supabase
      .from("wallets")
      .select("balance")
      .eq("user_id", user.id)
      .single();

    if (data) {

      setBalance(data.balance);
    }
  }

  fetchWallet();

}, []);

  return (

    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] transition-all duration-300">

      {/* BACKGROUND EFFECTS */}
      <div className="fixed inset-0 -z-10 overflow-hidden">

        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/20 blur-[120px] rounded-full" />

        <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/20 blur-[120px] rounded-full" />

      </div>

      <div className="max-w-7xl mx-auto px-6 py-10">

        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 mb-10">

          <div>

            <h1 className="text-5xl font-bold">
              Wallet
            </h1>

            <p className="text-gray-400 mt-3 text-lg">
              Manage your Danmus SMS funds
            </p>

          </div>

          <Link href="/dashboard">

            <button
              title="Back Dashboard"
              className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-2xl font-semibold transition shadow-xl"
            >
              Back Dashboard
            </button>

          </Link>

        </div>

        {/* WALLET CARD */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-[32px] p-10 shadow-2xl text-white mb-10">

          <p className="text-lg opacity-80">
            Total Balance
          </p>

          <h2 className="text-6xl font-bold mt-4">
            ₦{Number(balance).toLocaleString()}
          </h2>

          <div className="flex flex-wrap gap-4 mt-8">

            <Link href="/add-funds">

              <button
                title="Fund Wallet"
                className="bg-white text-black hover:bg-gray-200 px-6 py-3 rounded-2xl font-semibold transition"
              >
                Fund Wallet
              </button>

            </Link>

            <button
              title="Withdraw"
              className="bg-white/20 hover:bg-white/30 px-6 py-3 rounded-2xl font-semibold transition backdrop-blur-xl"
            >
              Withdraw
            </button>

          </div>

        </div>

        {/* STATS */}
        <div className="grid md:grid-cols-3 gap-6 mb-10">

          <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-8 shadow-xl">

            <p className="text-gray-400">
              Total Deposits
            </p>

            <h3 className="text-4xl font-bold mt-4 text-green-500">
              ₦120,000
            </h3>

          </div>

          <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-8 shadow-xl">

            <p className="text-gray-400">
              Total Spent
            </p>

            <h3 className="text-4xl font-bold mt-4 text-red-500">
              ₦95,000
            </h3>

          </div>

          <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-8 shadow-xl">

            <p className="text-gray-400">
              Transactions
            </p>

            <h3 className="text-4xl font-bold mt-4 text-blue-500">
              58
            </h3>

          </div>

        </div>

        {/* QUICK ACTIONS */}
        <div className="mb-10">

          <h2 className="text-3xl font-bold mb-6">
            Quick Actions
          </h2>

          <div className="grid md:grid-cols-3 gap-6">

            <Link href="/add-funds">

              <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-8 hover:scale-105 transition shadow-xl cursor-pointer">

                <div className="text-5xl mb-5">
                  💰
                </div>

                <h3 className="text-2xl font-bold">
                  Add Funds
                </h3>

                <p className="text-gray-400 mt-3">
                  Fund your wallet instantly
                </p>

              </div>

            </Link>

            <Link href="/buy-number">

              <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-8 hover:scale-105 transition shadow-xl cursor-pointer">

                <div className="text-5xl mb-5">
                  📱
                </div>

                <h3 className="text-2xl font-bold">
                  Buy Number
                </h3>

                <p className="text-gray-400 mt-3">
                  Purchase virtual numbers
                </p>

              </div>

            </Link>

            <Link href="/sms-history">

              <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-8 hover:scale-105 transition shadow-xl cursor-pointer">

                <div className="text-5xl mb-5">
                  📩
                </div>

                <h3 className="text-2xl font-bold">
                  Transaction History
                </h3>

                <p className="text-gray-400 mt-3">
                  View wallet activities
                </p>

              </div>

            </Link>

          </div>

        </div>

        {/* TRANSACTION HISTORY */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-8 shadow-xl">

          <div className="flex items-center justify-between mb-8">

            <h2 className="text-3xl font-bold">
              Recent Transactions
            </h2>

            <Link
              href="/sms-history"
              className="text-blue-500 hover:text-blue-400"
            >
              View All
            </Link>

          </div>

          <div className="space-y-5">

            {/* TRANSACTION */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-[var(--input)] rounded-2xl p-5">

              <div>

                <h3 className="font-semibold text-lg">
                  Wallet Funding
                </h3>

                <p className="text-gray-400 text-sm mt-1">
                  May 20, 2026
                </p>

              </div>

              <div className="text-right">

                <p className="text-green-500 font-bold text-xl">
                  + ₦10,000
                </p>

                <p className="text-sm text-gray-400">
                  Successful
                </p>

              </div>

            </div>

            {/* TRANSACTION */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-[var(--input)] rounded-2xl p-5">

              <div>

                <h3 className="font-semibold text-lg">
                  WhatsApp Number
                </h3>

                <p className="text-gray-400 text-sm mt-1">
                  May 18, 2026
                </p>

              </div>

              <div className="text-right">

                <p className="text-red-500 font-bold text-xl">
                  - ₦1,500
                </p>

                <p className="text-sm text-gray-400">
                  Completed
                </p>

              </div>

            </div>

            {/* TRANSACTION */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-[var(--input)] rounded-2xl p-5">

              <div>

                <h3 className="font-semibold text-lg">
                  Telegram Number
                </h3>

                <p className="text-gray-400 text-sm mt-1">
                  May 16, 2026
                </p>

              </div>

              <div className="text-right">

                <p className="text-red-500 font-bold text-xl">
                  - ₦1,200
                </p>

                <p className="text-sm text-gray-400">
                  Completed
                </p>

              </div>

            </div>

          </div>

        </div>

      </div>

      <MobileNav />

    </main>
  );
}