"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import MobileNav from "@/components/MobileNav";

export default function DashboardPage() {

  const [balance, setBalance] = useState(0);

  const [username, setUsername] = useState("User");

  /* FETCH USER DATA */
  useEffect(() => {

    async function fetchUserData() {

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      /* FETCH WALLET */
      const { data: walletData, error: walletError } =
        await supabase
          .from("wallets")
          .select("balance")
          .eq("user_id", user.id)
          .single();

      if (walletData) {

        setBalance(walletData.balance);
      }

      if (walletError) {

        console.log(walletError);
      }

      /* FETCH PROFILE */
      const { data: profileData } =
        await supabase
          .from("profiles")
          .select("username")
          .eq("id", user.id)
          .single();

      if (profileData) {

        setUsername(profileData.username);
      }
    }

    fetchUserData();

  }, []);

  return (

    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] transition-all duration-300 pb-28 md:pb-0">

      {/* BACKGROUND EFFECTS */}
      <div className="fixed inset-0 -z-10 overflow-hidden">

        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/20 blur-[120px] rounded-full" />

        <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/20 blur-[120px] rounded-full" />

      </div>

      <div className="flex">

        {/* SIDEBAR */}
        <aside className="hidden md:flex flex-col w-72 min-h-screen border-r border-[var(--border)] bg-[var(--card)]/70 backdrop-blur-2xl p-6">

          <h1 className="text-3xl font-bold text-blue-500 mb-12">
            Danmus SMS
          </h1>

          <nav className="space-y-3">

            <Link href="/dashboard">

              <div className="bg-blue-600 text-white px-5 py-4 rounded-2xl font-semibold cursor-pointer">
                Dashboard
              </div>

            </Link>

            <Link href="/buy-number">

              <div className="hover:bg-[var(--input)] px-5 py-4 rounded-2xl transition cursor-pointer">
                Buy Number
              </div>

            </Link>

            <Link href="/wallet">

              <div className="hover:bg-[var(--input)] px-5 py-4 rounded-2xl transition cursor-pointer">
                Wallet
              </div>

            </Link>

            <Link href="/sms-history">

              <div className="hover:bg-[var(--input)] px-5 py-4 rounded-2xl transition cursor-pointer">
                SMS History
              </div>

            </Link>

            <Link href="/settings">

              <div className="hover:bg-[var(--input)] px-5 py-4 rounded-2xl transition cursor-pointer">
                Settings
              </div>

            </Link>

          </nav>

          <div className="mt-auto">

            <Link href="/login">

              <button
                title="Logout"
                className="w-full bg-red-600 hover:bg-red-700 py-4 rounded-2xl font-semibold transition"
              >
                Logout
              </button>

            </Link>

          </div>

        </aside>

        {/* MAIN CONTENT */}
        <div className="flex-1 p-4 md:p-10">

          {/* TOPBAR */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 mb-10">

            <div className="max-w-full overflow-hidden">

              <h1 className="text-3xl md:text-5xl font-bold break-words">
                Dashboard
              </h1>

              <p className="text-gray-400 mt-3 text-base md:text-lg break-words">
                Welcome back, {username}
              </p>

            </div>

            <div className="flex items-center gap-4 flex-wrap">

              <Link href="/add-funds">

                <button
                  title="Add Funds"
                  className="bg-blue-600 hover:bg-blue-700 px-5 md:px-6 py-3 rounded-2xl font-semibold transition shadow-xl"
                >
                  Add Funds
                </button>

              </Link>

              <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center text-white text-lg md:text-xl font-bold shadow-xl">

                {username.charAt(0).toUpperCase()}

              </div>

            </div>

          </div>

          {/* WALLET CARD */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-[32px] p-6 md:p-10 shadow-2xl mb-10 text-white overflow-hidden">

            <p className="text-lg opacity-80">
              Available Balance
            </p>

            <h2 className="text-4xl md:text-6xl font-bold mt-4 break-words">
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

              <Link href="/buy-number">

                <button
                  title="Buy Number"
                  className="bg-white/20 hover:bg-white/30 px-6 py-3 rounded-2xl font-semibold transition backdrop-blur-xl"
                >
                  Buy Number
                </button>

              </Link>

            </div>

          </div>

          {/* STATS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-10">

            <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-8 shadow-xl">

              <p className="text-gray-400">
                Orders
              </p>

              <h3 className="text-4xl font-bold mt-4">
                120
              </h3>

            </div>

            <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-8 shadow-xl">

              <p className="text-gray-400">
                Completed
              </p>

              <h3 className="text-4xl font-bold mt-4 text-green-500">
                98
              </h3>

            </div>

            <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-8 shadow-xl">

              <p className="text-gray-400">
                Pending
              </p>

              <h3 className="text-4xl font-bold mt-4 text-yellow-500">
                12
              </h3>

            </div>

            <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-8 shadow-xl">

              <p className="text-gray-400">
                Countries
              </p>

              <h3 className="text-4xl font-bold mt-4 text-blue-500">
                90+
              </h3>

            </div>

          </div>

          {/* QUICK ACTIONS */}
          <div className="mb-10">

            <h2 className="text-3xl font-bold mb-6">
              Quick Actions
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

              <Link href="/buy-number">

                <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-8 hover:scale-105 transition shadow-xl cursor-pointer">

                  <div className="text-5xl mb-5">
                    📱
                  </div>

                  <h3 className="text-2xl font-bold">
                    Buy Number
                  </h3>

                  <p className="text-gray-400 mt-3">
                    Purchase virtual numbers instantly
                  </p>

                </div>

              </Link>

              <Link href="/wallet">

                <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-8 hover:scale-105 transition shadow-xl cursor-pointer">

                  <div className="text-5xl mb-5">
                    💳
                  </div>

                  <h3 className="text-2xl font-bold">
                    Wallet
                  </h3>

                  <p className="text-gray-400 mt-3">
                    Manage your funds and payments
                  </p>

                </div>

              </Link>

              <Link href="/sms-history">

                <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-8 hover:scale-105 transition shadow-xl cursor-pointer">

                  <div className="text-5xl mb-5">
                    📩
                  </div>

                  <h3 className="text-2xl font-bold">
                    SMS History
                  </h3>

                  <p className="text-gray-400 mt-3">
                    View all your OTP orders
                  </p>

                </div>

              </Link>

            </div>

          </div>

          {/* RECENT ACTIVITY */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-6 md:p-8 shadow-xl">

            <div className="flex items-center justify-between mb-8 flex-wrap gap-4">

              <h2 className="text-2xl md:text-3xl font-bold">
                Recent Activity
              </h2>

              <Link
                href="/sms-history"
                className="text-blue-500 hover:text-blue-400"
              >
                View All
              </Link>

            </div>

            <div className="space-y-5">

              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-[var(--input)] rounded-2xl p-5">

                <div>

                  <h3 className="font-semibold">
                    No Activity Yet
                  </h3>

                  <p className="text-gray-400 text-sm mt-1 break-words">
                    Your recent orders and wallet activities will appear here
                  </p>

                </div>

                <span className="bg-blue-500/20 text-blue-500 px-4 py-2 rounded-xl text-sm w-fit">
                  Empty
                </span>

              </div>

            </div>

          </div>

        </div>

      </div>

      <MobileNav />

    </main>
  );
}