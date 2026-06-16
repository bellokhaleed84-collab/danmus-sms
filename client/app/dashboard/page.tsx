"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import MobileNav from "@/components/MobileNav";
import { useRouter } from "next/navigation";

export default function DashboardPage() {

  const router = useRouter();

  const [balance, setBalance] = useState(0);

  const [username, setUsername] = useState("User");

  /* FETCH USER DATA */
  useEffect(() => {

    async function fetchUserData() {

      try {

        const token = localStorage.getItem("token");

        const cachedUser = JSON.parse(
          localStorage.getItem("user") || "{}"
        );

        if (!token) {

          router.push("/login");

          return;
        }

        /* SET CACHED DATA FIRST SO DASHBOARD LOADS INSTANTLY */
        if (cachedUser?.name) {

          setUsername(cachedUser.name);
        }

        if (cachedUser?.balance !== undefined) {

          setBalance(cachedUser.balance);
        }

        /* THEN FETCH FRESH DATA FROM BACKEND */
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/users/profile`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        const data = await response.json();

        console.log(data);

        if (!response.ok) {

          /* DON'T LOGOUT ON 401 — JUST USE CACHED DATA */
          console.log("Profile fetch failed, using cached data");

          return;
        }

        setBalance(data.balance || 0);

        setUsername(data.name || "User");

        /* UPDATE CACHE */
        localStorage.setItem("user", JSON.stringify(data));

      } catch (error) {

        console.log(error);
      }
    }

    fetchUserData();

  }, [router]);

  return (

    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] transition-all duration-300 pb-28 md:pb-0 overflow-x-hidden">

      {/* BACKGROUND EFFECTS */}
      <div className="fixed inset-0 -z-10 overflow-hidden">

        <div className="absolute top-0 left-0 w-72 md:w-96 h-72 md:h-96 bg-blue-500/20 blur-[120px] rounded-full" />

        <div className="absolute bottom-0 right-0 w-72 md:w-96 h-72 md:h-96 bg-purple-500/20 blur-[120px] rounded-full" />

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

            <button
              title="Logout"
              onClick={() => {

                localStorage.removeItem("token");

                localStorage.removeItem("user");

                router.push("/login");
              }}
              className="w-full bg-red-600 hover:bg-red-700 py-4 rounded-2xl font-semibold transition"
            >
              Logout
            </button>

          </div>

        </aside>

        {/* MAIN CONTENT */}
        <div className="flex-1 p-4 sm:p-5 md:p-10 max-w-full overflow-hidden">

          {/* TOPBAR */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5 mb-8 md:mb-10">

            <div className="min-w-0">

              <h1 className="text-2xl sm:text-3xl md:text-5xl font-bold break-words">
                Dashboard
              </h1>

              <p className="text-gray-400 mt-2 md:mt-3 text-sm sm:text-base md:text-lg break-words">
                Welcome back, {username}
              </p>

            </div>

            <div className="flex items-center gap-3 sm:gap-4 flex-wrap">

              <Link href="/add-funds">

                <button
                  title="Add Funds"
                  className="bg-blue-600 hover:bg-blue-700 px-4 sm:px-5 md:px-6 py-3 rounded-2xl font-semibold transition shadow-xl text-sm sm:text-base"
                >
                  Add Funds
                </button>

              </Link>

              <div className="w-11 h-11 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center text-white text-base sm:text-lg md:text-xl font-bold shadow-xl shrink-0">

                {username.charAt(0).toUpperCase()}

              </div>

            </div>

          </div>

          {/* WALLET CARD */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-[28px] md:rounded-[32px] p-5 sm:p-6 md:p-10 shadow-2xl mb-8 md:mb-10 text-white overflow-hidden">

            <p className="text-base md:text-lg opacity-80">
              Available Balance
            </p>

            <h2 className="text-3xl sm:text-4xl md:text-6xl font-bold mt-4 break-words leading-tight">
              ₦{Number(balance).toLocaleString()}
            </h2>

            <div className="flex flex-wrap gap-3 md:gap-4 mt-6 md:mt-8">

              <Link href="/add-funds">

                <button
                  title="Fund Wallet"
                  className="bg-white text-black hover:bg-gray-200 px-4 md:px-6 py-3 rounded-2xl font-semibold transition text-sm sm:text-base"
                >
                  Fund Wallet
                </button>

              </Link>

              <Link href="/buy-number">

                <button
                  title="Buy Number"
                  className="bg-white/20 hover:bg-white/30 px-4 md:px-6 py-3 rounded-2xl font-semibold transition backdrop-blur-xl text-sm sm:text-base"
                >
                  Buy Number
                </button>

              </Link>

            </div>

          </div>

          {/* STATS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-8 md:mb-10">

            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl md:rounded-3xl p-4 sm:p-5 md:p-8 shadow-xl">

              <p className="text-gray-400 text-sm sm:text-base">
                Orders
              </p>

              <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold mt-3 md:mt-4">
                0
              </h3>

            </div>

            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl md:rounded-3xl p-4 sm:p-5 md:p-8 shadow-xl">

              <p className="text-gray-400 text-sm sm:text-base">
                Completed
              </p>

              <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold mt-3 md:mt-4 text-green-500">
                0
              </h3>

            </div>

            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl md:rounded-3xl p-4 sm:p-5 md:p-8 shadow-xl">

              <p className="text-gray-400 text-sm sm:text-base">
                Pending
              </p>

              <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold mt-3 md:mt-4 text-yellow-500">
                0
              </h3>

            </div>

            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl md:rounded-3xl p-4 sm:p-5 md:p-8 shadow-xl">

              <p className="text-gray-400 text-sm sm:text-base">
                Countries
              </p>

              <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold mt-3 md:mt-4 text-blue-500">
                0
              </h3>

            </div>

          </div>

          {/* QUICK ACTIONS */}
          <div className="mb-8 md:mb-10">

            <h2 className="text-2xl md:text-3xl font-bold mb-5 md:mb-6">
              Quick Actions
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">

              <Link href="/buy-number">

                <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl md:rounded-3xl p-5 md:p-8 hover:scale-[1.02] md:hover:scale-105 transition shadow-xl cursor-pointer">

                  <div className="text-4xl md:text-5xl mb-4 md:mb-5">
                    📱
                  </div>

                  <h3 className="text-xl md:text-2xl font-bold">
                    Buy Number
                  </h3>

                  <p className="text-gray-400 mt-3 text-sm md:text-base leading-7">
                    Purchase virtual numbers instantly
                  </p>

                </div>

              </Link>

              <Link href="/wallet">

                <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl md:rounded-3xl p-5 md:p-8 hover:scale-[1.02] md:hover:scale-105 transition shadow-xl cursor-pointer">

                  <div className="text-4xl md:text-5xl mb-4 md:mb-5">
                    💳
                  </div>

                  <h3 className="text-xl md:text-2xl font-bold">
                    Wallet
                  </h3>

                  <p className="text-gray-400 mt-3 text-sm md:text-base leading-7">
                    Manage your funds and payments
                  </p>

                </div>

              </Link>

              <Link href="/sms-history">

                <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl md:rounded-3xl p-5 md:p-8 hover:scale-[1.02] md:hover:scale-105 transition shadow-xl cursor-pointer">

                  <div className="text-4xl md:text-5xl mb-4 md:mb-5">
                    📩
                  </div>

                  <h3 className="text-xl md:text-2xl font-bold">
                    SMS History
                  </h3>

                  <p className="text-gray-400 mt-3 text-sm md:text-base leading-7">
                    View all your OTP orders
                  </p>

                </div>

              </Link>

            </div>

          </div>

          {/* RECENT ACTIVITY */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl md:rounded-3xl p-5 md:p-8 shadow-xl">

            <div className="flex items-center justify-between mb-6 md:mb-8 flex-wrap gap-4">

              <h2 className="text-2xl md:text-3xl font-bold">
                Recent Activity
              </h2>

              <Link
                href="/sms-history"
                className="text-blue-500 hover:text-blue-400 text-sm md:text-base"
              >
                View All
              </Link>

            </div>

            <div className="space-y-5">

              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-[var(--input)] rounded-2xl p-5">

                <div className="min-w-0">

                  <h3 className="font-semibold">
                    No Activity Yet
                  </h3>

                  <p className="text-gray-400 text-sm mt-1 break-words leading-6">
                    Your recent orders and wallet activities will appear here
                  </p>

                </div>

                <span className="bg-blue-500/20 text-blue-500 px-4 py-2 rounded-xl text-sm w-fit shrink-0">
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