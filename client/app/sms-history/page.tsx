"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import MobileNav from "@/components/MobileNav";

export default function SmsHistoryPage() {

  const [smsHistory, setSmsHistory] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);

  /* FETCH SMS HISTORY */
  useEffect(() => {

    async function fetchSmsHistory() {

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from("sms_orders")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (data) {

        setSmsHistory(data);
      }

      if (error) {

        console.log(error);
      }

      setLoading(false);
    }

    fetchSmsHistory();

  }, []);

  /* STATS */
  const totalOrders = smsHistory.length;

  const completedOrders = smsHistory.filter(
    (sms) => sms.status === "Completed"
  ).length;

  const pendingOrders = smsHistory.filter(
    (sms) => sms.status === "Pending"
  ).length;

  return (

    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] transition-all duration-300 pb-28 md:pb-0 overflow-x-hidden">

      {/* BACKGROUND EFFECTS */}
      <div className="fixed inset-0 -z-10 overflow-hidden">

        <div className="absolute top-0 left-0 w-72 md:w-96 h-72 md:h-96 bg-blue-500/20 blur-[120px] rounded-full" />

        <div className="absolute bottom-0 right-0 w-72 md:w-96 h-72 md:h-96 bg-purple-500/20 blur-[120px] rounded-full" />

      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-10">

        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 mb-10">

          <div>

            <h1 className="text-3xl md:text-5xl font-bold">
              SMS History
            </h1>

            <p className="text-gray-400 mt-3 text-sm md:text-lg">
              View all your OTP and SMS activities
            </p>

          </div>

          <Link href="/dashboard">

            <button
              title="Back Dashboard"
              className="bg-blue-600 hover:bg-blue-700 px-5 md:px-6 py-3 rounded-2xl font-semibold transition shadow-xl"
            >
              Back Dashboard
            </button>

          </Link>

        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-10">

          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl md:rounded-3xl p-5 md:p-8 shadow-xl">

            <p className="text-gray-400 text-sm md:text-base">
              Total Orders
            </p>

            <h2 className="text-3xl md:text-5xl font-bold mt-4">
              {totalOrders}
            </h2>

          </div>

          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl md:rounded-3xl p-5 md:p-8 shadow-xl">

            <p className="text-gray-400 text-sm md:text-base">
              Completed
            </p>

            <h2 className="text-3xl md:text-5xl font-bold mt-4 text-green-500">
              {completedOrders}
            </h2>

          </div>

          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl md:rounded-3xl p-5 md:p-8 shadow-xl">

            <p className="text-gray-400 text-sm md:text-base">
              Pending
            </p>

            <h2 className="text-3xl md:text-5xl font-bold mt-4 text-yellow-500">
              {pendingOrders}
            </h2>

          </div>

        </div>

        {/* TABLE */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-[28px] md:rounded-[32px] shadow-2xl overflow-hidden">

          <div className="overflow-x-auto">

            <table className="w-full min-w-[800px]">

              <thead className="bg-[var(--input)]">

                <tr>

                  <th className="text-left p-5 md:p-6">
                    Service
                  </th>

                  <th className="text-left p-5 md:p-6">
                    Country
                  </th>

                  <th className="text-left p-5 md:p-6">
                    Number
                  </th>

                  <th className="text-left p-5 md:p-6">
                    OTP
                  </th>

                  <th className="text-left p-5 md:p-6">
                    Status
                  </th>

                  <th className="text-left p-5 md:p-6">
                    Date
                  </th>

                </tr>

              </thead>

              <tbody>

                {loading ? (

                  <tr>

                    <td
                      colSpan={6}
                      className="p-10 text-center text-gray-400"
                    >
                      Loading...
                    </td>

                  </tr>

                ) : smsHistory.length === 0 ? (

                  <tr>

                    <td
                      colSpan={6}
                      className="p-10 text-center text-gray-400"
                    >
                      No SMS history yet
                    </td>

                  </tr>

                ) : (

                  smsHistory.map((sms) => (

                    <tr
                      key={sms.id}
                      className="border-t border-[var(--border)] hover:bg-[var(--input)] transition"
                    >

                      <td className="p-5 md:p-6 font-semibold">
                        {sms.service}
                      </td>

                      <td className="p-5 md:p-6">
                        {sms.country}
                      </td>

                      <td className="p-5 md:p-6">
                        {sms.number}
                      </td>

                      <td className="p-5 md:p-6 font-bold tracking-widest">
                        {sms.otp}
                      </td>

                      <td className="p-5 md:p-6">

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

                      <td className="p-5 md:p-6 text-gray-400">

                        {new Date(sms.created_at).toLocaleDateString()}

                      </td>

                    </tr>

                  ))

                )}

              </tbody>

            </table>

          </div>

        </div>

      </div>

      <MobileNav />

    </main>
  );
}