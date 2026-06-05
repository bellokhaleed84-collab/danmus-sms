"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import API from "@/lib/api";

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [adminEmail, setAdminEmail] = useState("");

  useEffect(() => {
    async function loadAdmin() {
      const token = localStorage.getItem("token");
      const user = JSON.parse(localStorage.getItem("user") || "{}");

      if (!token || !user?.email) { router.push("/login"); return; }

      if (user.role !== "admin") { router.push("/dashboard"); return; }

      setAdminEmail(user.email);

      try {
        const response = await API.get("/users/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUsers([response.data]);
      } catch (error) {
        console.log(error);
      }
      setLoading(false);
    }
    loadAdmin();
  }, [router]);

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
          <h1 className="text-2xl md:text-3xl font-bold">Loading Admin Panel...</h1>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] transition-all duration-300">
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/20 blur-[120px] rounded-full" />
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 mb-10">
          <div>
            <h1 className="text-2xl md:text-5xl font-bold">Admin Dashboard</h1>
            <p className="text-gray-400 mt-3 text-lg">Manage your Danmus SMS platform</p>
          </div>
          <div className="flex gap-4">
            <Link href="/dashboard">
              <button className="bg-blue-600 hover:bg-blue-700 px-4 md:px-6 py-3 rounded-2xl font-semibold transition shadow-xl">
                User Dashboard
              </button>
            </Link>
            <button
              onClick={() => { localStorage.clear(); router.push("/login"); }}
              className="bg-red-600 hover:bg-red-700 px-4 md:px-6 py-3 rounded-2xl font-semibold transition shadow-xl"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl md:rounded-3xl p-5 md:p-8 shadow-2xl mb-10">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Admin Access</h2>
          <p className="text-gray-400 text-lg">Logged in as:</p>
          <p className="text-blue-500 font-bold text-2xl mt-2">{adminEmail}</p>
        </div>

        <div className="grid md:grid-cols-4 gap-6 mb-10">
          {[
            { label: "Total Users", value: users.length, color: "text-white" },
            { label: "Wallet Users", value: users.length, color: "text-green-500" },
            { label: "Platform Status", value: "LIVE", color: "text-blue-500" },
            { label: "OTP Orders", value: 0, color: "text-yellow-500" },
          ].map((stat) => (
            <div key={stat.label} className="bg-[var(--card)] border border-[var(--border)] rounded-2xl md:rounded-3xl p-5 md:p-8 shadow-xl">
              <p className="text-gray-400">{stat.label}</p>
              <h2 className={`text-2xl md:text-5xl font-bold mt-4 ${stat.color}`}>{stat.value}</h2>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}