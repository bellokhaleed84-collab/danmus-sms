"use client";

import Link from "next/link";
import MobileNav from "@/components/MobileNav";

export default function SmsHistoryPage() {

  const smsHistory = [

    {
      id: 1,
      service: "WhatsApp",
      country: "Nigeria",
      number: "+234 901 234 5678",
      status: "Completed",
      otp: "483920",
      date: "20 May 2026",
    },

    {
      id: 2,
      service: "Telegram",
      country: "United Kingdom",
      number: "+44 7400 123456",
      status: "Pending",
      otp: "------",
      date: "19 May 2026",
    },

    {
      id: 3,
      service: "Google",
      country: "United States",
      number: "+1 202 555 0198",
      status: "Completed",
      otp: "194837",
      date: "18 May 2026",
    },

    {
      id: 4,
      service: "TikTok",
      country: "Canada",
      number: "+1 416 555 8899",
      status: "Cancelled",
      otp: "------",
      date: "17 May 2026",
    },
  ];

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
              SMS History
            </h1>

            <p className="text-gray-400 mt-3 text-lg">
              View all your OTP and SMS activities
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

        {/* STATS */}
        <div className="grid md:grid-cols-3 gap-6 mb-10">

          <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-8 shadow-xl">

            <p className="text-gray-400">
              Total Orders
            </p>

            <h2 className="text-5xl font-bold mt-4">
              120
            </h2>

          </div>

          <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-8 shadow-xl">

            <p className="text-gray-400">
              Completed
            </p>

            <h2 className="text-5xl font-bold mt-4 text-green-500">
              98
            </h2>

          </div>

          <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-8 shadow-xl">

            <p className="text-gray-400">
              Pending
            </p>

            <h2 className="text-5xl font-bold mt-4 text-yellow-500">
              12
            </h2>

          </div>

        </div>

        {/* TABLE */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-[32px] shadow-2xl overflow-hidden">

          <div className="overflow-x-auto">

            <table className="w-full">

              <thead className="bg-[var(--input)]">

                <tr>

                  <th className="text-left p-6">
                    Service
                  </th>

                  <th className="text-left p-6">
                    Country
                  </th>

                  <th className="text-left p-6">
                    Number
                  </th>

                  <th className="text-left p-6">
                    OTP
                  </th>

                  <th className="text-left p-6">
                    Status
                  </th>

                  <th className="text-left p-6">
                    Date
                  </th>

                </tr>

              </thead>

              <tbody>

                {smsHistory.map((sms) => (

                  <tr
                    key={sms.id}
                    className="border-t border-[var(--border)] hover:bg-[var(--input)] transition"
                  >

                    <td className="p-6 font-semibold">
                      {sms.service}
                    </td>

                    <td className="p-6">
                      {sms.country}
                    </td>

                    <td className="p-6">
                      {sms.number}
                    </td>

                    <td className="p-6 font-bold tracking-widest">
                      {sms.otp}
                    </td>

                    <td className="p-6">

                      <span
                        className={`px-4 py-2 rounded-xl text-sm font-semibold ${
                          sms.status === "Completed"
                            ? "bg-green-500/20 text-green-500"
                            : sms.status === "Pending"
                            ? "bg-yellow-500/20 text-yellow-500"
                            : "bg-red-500/20 text-red-500"
                        }`}
                      >

                        {sms.status}

                      </span>

                    </td>

                    <td className="p-6 text-gray-400">
                      {sms.date}
                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        </div>

        {/* EXTRA CARDS */}
        <div className="grid md:grid-cols-3 gap-6 mt-10">

          <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-8 shadow-xl">

            <div className="text-5xl mb-5">
              ⚡
            </div>

            <h3 className="text-2xl font-bold">
              Fast OTP Delivery
            </h3>

            <p className="text-gray-400 mt-3">
              Receive OTPs instantly after purchase
            </p>

          </div>

          <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-8 shadow-xl">

            <div className="text-5xl mb-5">
              🔒
            </div>

            <h3 className="text-2xl font-bold">
              Secure Verification
            </h3>

            <p className="text-gray-400 mt-3">
              Protected and encrypted SMS handling
            </p>

          </div>

          <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-8 shadow-xl">

            <div className="text-5xl mb-5">
              🌍
            </div>

            <h3 className="text-2xl font-bold">
              Global Coverage
            </h3>

            <p className="text-gray-400 mt-3">
              Access numbers from multiple countries
            </p>

          </div>

        </div>

      </div>

      <MobileNav />

    </main>
  );
}