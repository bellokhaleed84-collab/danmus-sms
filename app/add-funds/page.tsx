"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import MobileNav from "@/components/MobileNav";
import { useRouter } from "next/navigation";

export default function AddFundsPage() {

  const router = useRouter();

  const [balance, setBalance] = useState(0);

  const [amount, setAmount] = useState("");

  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState("");

  /* FETCH USER DATA */
  useEffect(() => {

    async function fetchUser() {

      try {

        const token = localStorage.getItem("token");

        if (!token) {

          router.push("/login");

          return;
        }

        const response = await fetch(
  `${process.env.NEXT_PUBLIC_API_URL}/api/users/profile`,
  {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
);
        const data = await response.json();

        if (!response.ok) {

          router.push("/login");

          return;
        }

        setBalance(data.balance || 0);

        setEmail(data.email);

      } catch (error) {

        console.log(error);
      }
    }

    fetchUser();

  }, [router]);

  /* HANDLE PAYMENT */
  async function handlePayment() {

    try {

      if (!amount) {

        alert("Please enter amount");

        return;
      }

      if (Number(amount) < 100) {

        alert("Minimum funding is ₦100");

        return;
      }

      setLoading(true);

      const token = localStorage.getItem("token");

      const response = await fetch(
  `${process.env.NEXT_PUBLIC_API_URL}/api/payment/initialize`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      email,
      amount,
    }),
  }
);

      const data = await response.json();

      console.log(data);

      if (!response.ok) {

        alert(data.message || "Payment initialize failed");

        setLoading(false);

        return;
      }

      window.location.href =
        data.data.authorization_url;

    } catch (error) {

      console.log(error);

      alert("Something went wrong");

    } finally {

      setLoading(false);
    }
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

            <h1 className="text-2xl md:text-5xl font-bold">
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

          <h2 className="text-4xl md:text-6xl font-bold mt-4">
            ₦{Number(balance).toLocaleString()}
          </h2>

          <p className="mt-4 opacity-80">
            Secure wallet funding with Paystack
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
                type="button"
                title={`₦${value}`}
                onClick={() =>
                  setAmount(value.toString())
                }
                className="bg-[var(--input)] hover:bg-blue-600 hover:text-white border border-[var(--border)] py-4 rounded-2xl font-semibold transition"
              >
                ₦{value.toLocaleString()}
              </button>

            ))}

          </div>

          {/* PAYMENT BUTTON */}
          <button
            title="Proceed Payment"
            onClick={handlePayment}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 py-5 rounded-2xl text-xl font-bold transition shadow-xl disabled:opacity-50"
          >

            {loading
              ? "Processing..."
              : "Proceed Payment"}

          </button>

        </div>

      </div>

      <MobileNav />

    </main>
  );
}