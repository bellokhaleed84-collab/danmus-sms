"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import MobileNav from "@/components/MobileNav";

export default function BuyNumberPage() {

  const [country, setCountry] = useState("");

  const [service, setService] = useState("");

  const [balance, setBalance] = useState(0);

  /* FETCH WALLET */
  useEffect(() => {

    async function fetchWallet() {

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from("wallets")
        .select("balance")
        .eq("user_id", user.id)
        .single();

      if (data) {

        setBalance(data.balance);
      }

      if (error) {

        console.log(error);
      }
    }

    fetchWallet();

  }, []);

  /* BUY NUMBER */
  function handleBuyNumber() {

    if (!country || !service) {

      alert("Please select country and service");

      return;
    }

    if (balance < 1500) {

      alert("Insufficient wallet balance");

      return;
    }

    alert(
      `Number purchased for ${service} in ${country}`
    );
  }

  return (

    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] transition-all duration-300">

      {/* BACKGROUND EFFECTS */}
      <div className="fixed inset-0 -z-10 overflow-hidden">

        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/20 blur-[120px] rounded-full" />

        <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/20 blur-[120px] rounded-full" />

      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-10">

        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 mb-10">

          <div>

            <h1 className="text-2xl md:text-3xl md:text-2xl md:text-3xl md:text-5xl font-bold">
              Buy Number
            </h1>

            <p className="text-gray-400 mt-3 text-lg">
              Purchase virtual numbers instantly
            </p>

          </div>

          <Link href="/dashboard">

            <button
              title="Back Dashboard"
              className="bg-blue-600 hover:bg-blue-700 px-4 md:px-6 py-3 rounded-2xl font-semibold transition shadow-xl"
            >
              Back Dashboard
            </button>

          </Link>

        </div>

        {/* WALLET CARD */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-[32px] p-6 md:p-10 shadow-2xl text-white mb-10">

          <p className="text-lg opacity-80">
            Wallet Balance
          </p>

          <h2 className="text-2xl md:text-4xl md:text-6xl font-bold mt-4">
            ₦{Number(balance).toLocaleString()}
          </h2>

          <div className="mt-8">

            <Link href="/add-funds">

              <button
                title="Add Funds"
                className="bg-white text-black hover:bg-gray-200 px-4 md:px-6 py-3 rounded-2xl font-semibold transition"
              >
                Add Funds
              </button>

            </Link>

          </div>

        </div>

        {/* BUY CARD */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-[32px] p-6 md:p-10 shadow-2xl">

          <h2 className="text-2xl md:text-3xl font-bold mb-8">
            Purchase Number
          </h2>

          <div className="grid md:grid-cols-2 gap-5 md:p-8">

            {/* COUNTRY */}
            <div>

              <label className="block mb-3 text-lg font-semibold">
                Select Country
              </label>

              <select
                title="Select Country"
                value={country}
                onChange={(e) =>
                  setCountry(e.target.value)
                }
                className="w-full bg-[var(--input)] border border-[var(--border)] rounded-2xl px-5 py-3 md:py-4 outline-none focus:border-blue-500"
              >

                <option value="">
                  Choose country
                </option>

                <option value="Nigeria">
                  🇳🇬 Nigeria
                </option>

                <option value="United States">
                  🇺🇸 United States
                </option>

                <option value="United Kingdom">
                  🇬🇧 United Kingdom
                </option>

                <option value="Canada">
                  🇨🇦 Canada
                </option>

                <option value="India">
                  🇮🇳 India
                </option>

              </select>

            </div>

            {/* SERVICE */}
            <div>

              <label className="block mb-3 text-lg font-semibold">
                Select Service
              </label>

              <select
                title="Select Service"
                value={service}
                onChange={(e) =>
                  setService(e.target.value)
                }
                className="w-full bg-[var(--input)] border border-[var(--border)] rounded-2xl px-5 py-3 md:py-4 outline-none focus:border-blue-500"
              >

                <option value="">
                  Choose service
                </option>

                <option value="WhatsApp">
                  WhatsApp
                </option>

                <option value="Telegram">
                  Telegram
                </option>

                <option value="Google">
                  Google
                </option>

                <option value="Facebook">
                  Facebook
                </option>

                <option value="TikTok">
                  TikTok
                </option>

              </select>

            </div>

          </div>

          {/* PRICE CARD */}
          <div className="bg-[var(--input)] border border-[var(--border)] rounded-2xl md:rounded-3xl p-5 md:p-8 mt-10">

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">

              <div>

                <h3 className="text-2xl font-bold">
                  Estimated Price
                </h3>

                <p className="text-gray-400 mt-2">
                  Price may vary based on availability
                </p>

              </div>

              <h2 className="text-2xl md:text-3xl md:text-5xl font-bold text-blue-500">
                ₦1,500
              </h2>

            </div>

          </div>

          {/* BUTTON */}
          <button
            title="Buy Number"
            onClick={handleBuyNumber}
            className="w-full bg-blue-600 hover:bg-blue-700 py-5 rounded-2xl font-bold text-lg transition shadow-xl mt-10"
          >
            Buy Number
          </button>

        </div>

        {/* SERVICES */}
        <div className="grid md:grid-cols-3 gap-6 mt-10">

          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl md:rounded-3xl p-5 md:p-8 shadow-xl">

            <div className="text-2xl md:text-3xl md:text-5xl mb-5">
              ⚡
            </div>

            <h3 className="text-2xl font-bold">
              Instant Delivery
            </h3>

            <p className="text-gray-400 mt-3">
              Receive numbers immediately after purchase
            </p>

          </div>

          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl md:rounded-3xl p-5 md:p-8 shadow-xl">

            <div className="text-2xl md:text-3xl md:text-5xl mb-5">
              🌍
            </div>

            <h3 className="text-2xl font-bold">
              Global Countries
            </h3>

            <p className="text-gray-400 mt-3">
              Access numbers from multiple countries
            </p>

          </div>

          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl md:rounded-3xl p-5 md:p-8 shadow-xl">

            <div className="text-2xl md:text-3xl md:text-5xl mb-5">
              🔒
            </div>

            <h3 className="text-2xl font-bold">
              Secure Platform
            </h3>

            <p className="text-gray-400 mt-3">
              Safe and reliable OTP services
            </p>

          </div>

        </div>

      </div>

<MobileNav />

    </main>
  );
}