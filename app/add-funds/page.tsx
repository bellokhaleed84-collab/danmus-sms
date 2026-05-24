"use client";

import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useEffect, useState } from "react";
import MobileNav from "@/components/MobileNav";

export default function AddFundsPage() {

  const [balance, setBalance] = useState(0);

  const [amount, setAmount] = useState("");

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

  /* PAYMENT */
  function handlePayment() {

    if (!amount) {

      alert("Please enter amount");

      return;
    }

    alert(`Payment initialized for ₦${amount}`);
  }

  return (

    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] transition-all duration-300">

      {/* BACKGROUND EFFECTS */}
      <div className="fixed inset-0 -z-10 overflow-hidden">

        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/20 blur-[120px] rounded-full" />

        <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/20 blur-[120px] rounded-full" />

      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-10">

        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 mb-10">

          <div>

            <h1 className="text-2xl md:text-3xl md:text-2xl md:text-3xl md:text-5xl font-bold">
              Add Funds
            </h1>

            <p className="text-gray-400 mt-3 text-lg">
              Fund your wallet securely
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
            Current Wallet Balance
          </p>

          <h2 className="text-2xl md:text-4xl md:text-6xl font-bold mt-4">
            ₦{Number(balance).toLocaleString()}
          </h2>

          <p className="mt-4 opacity-80">
            Funds are added instantly after successful payment
          </p>

        </div>

        {/* PAYMENT FORM */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-[32px] p-6 md:p-10 shadow-2xl">

          <h2 className="text-2xl md:text-3xl font-bold mb-8">
            Fund Wallet
          </h2>

          {/* AMOUNT */}
          <div className="mb-8">

            <label className="block mb-3 text-lg font-semibold">
              Enter Amount
            </label>

            <input
              title="Amount"
              type="number"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) =>
                setAmount(e.target.value)
              }
              className="w-full bg-[var(--input)] border border-[var(--border)] rounded-2xl px-5 py-5 text-xl outline-none focus:border-blue-500"
            />

          </div>

          {/* QUICK AMOUNTS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">

            {[1000, 2000, 5000, 10000].map((value) => (

              <button
                key={value}
                title={`₦${value}`}
                onClick={() =>
                  setAmount(value.toString())
                }
                className="bg-[var(--input)] hover:bg-blue-600 hover:text-white border border-[var(--border)] py-3 md:py-4 rounded-2xl font-semibold transition"
              >
                ₦{value.toLocaleString()}
              </button>

            ))}

          </div>

          {/* PAYMENT METHODS */}
          <div className="mb-10">

            <h3 className="text-2xl font-bold mb-6">
              Payment Methods
            </h3>

            <div className="grid md:grid-cols-3 gap-6">

              {/* PAYSTACK */}
              <div className="bg-[var(--input)] border border-[var(--border)] rounded-2xl md:rounded-3xl p-5 md:p-8 hover:scale-105 transition shadow-xl cursor-pointer">

                <div className="text-2xl md:text-3xl md:text-5xl mb-5">
                  💳
                </div>

                <h4 className="text-2xl font-bold">
                  Paystack
                </h4>

                <p className="text-gray-400 mt-3">
                  Secure online card payment
                </p>

              </div>

              {/* BANK */}
              <div className="bg-[var(--input)] border border-[var(--border)] rounded-2xl md:rounded-3xl p-5 md:p-8 hover:scale-105 transition shadow-xl cursor-pointer">

                <div className="text-2xl md:text-3xl md:text-5xl mb-5">
                  🏦
                </div>

                <h4 className="text-2xl font-bold">
                  Bank Transfer
                </h4>

                <p className="text-gray-400 mt-3">
                  Transfer directly to company account
                </p>

              </div>

              {/* CRYPTO */}
              <div className="bg-[var(--input)] border border-[var(--border)] rounded-2xl md:rounded-3xl p-5 md:p-8 hover:scale-105 transition shadow-xl cursor-pointer">

                <div className="text-2xl md:text-3xl md:text-5xl mb-5">
                  ₿
                </div>

                <h4 className="text-2xl font-bold">
                  Crypto
                </h4>

                <p className="text-gray-400 mt-3">
                  USDT and Bitcoin payments
                </p>

              </div>

            </div>

          </div>

          {/* BUTTON */}
          <button
            title="Proceed Payment"
            onClick={handlePayment}
            className="w-full bg-blue-600 hover:bg-blue-700 py-5 rounded-2xl text-xl font-bold transition shadow-xl"
          >
            Proceed Payment
          </button>

        </div>

        {/* INFO CARDS */}
        <div className="grid md:grid-cols-3 gap-6 mt-10">

          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl md:rounded-3xl p-5 md:p-8 shadow-xl">

            <div className="text-2xl md:text-3xl md:text-5xl mb-5">
              ⚡
            </div>

            <h3 className="text-2xl font-bold">
              Instant Funding
            </h3>

            <p className="text-gray-400 mt-3">
              Wallet updates immediately after payment
            </p>

          </div>

          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl md:rounded-3xl p-5 md:p-8 shadow-xl">

            <div className="text-2xl md:text-3xl md:text-5xl mb-5">
              🔒
            </div>

            <h3 className="text-2xl font-bold">
              Secure Payments
            </h3>

            <p className="text-gray-400 mt-3">
              All transactions are encrypted and protected
            </p>

          </div>

          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl md:rounded-3xl p-5 md:p-8 shadow-xl">

            <div className="text-2xl md:text-3xl md:text-5xl mb-5">
              🌍
            </div>

            <h3 className="text-2xl font-bold">
              Multiple Methods
            </h3>

            <p className="text-gray-400 mt-3">
              Fund your wallet using different payment systems
            </p>

          </div>

        </div>

      </div>

      <MobileNav />

    </main>
  );
}