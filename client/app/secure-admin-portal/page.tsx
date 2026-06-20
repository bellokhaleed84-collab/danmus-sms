"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import API from "@/lib/api";

export default function AdminPage() {

  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [txFilter, setTxFilter] = useState("all");
  const [adminEmail, setAdminEmail] = useState("");
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalRevenue: 0,
    totalTransactions: 0,
  });
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function loadAdmin() {
      const token = localStorage.getItem("token");
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      if (!token || !user?.email) { router.push("/login"); return; }
      if (user.role !== "admin") { router.push("/dashboard"); return; }
      setAdminEmail(user.email);
      try {
        const [usersRes, statsRes, txRes] = await Promise.all([
          API.get("/admin/users", { headers: { Authorization: `Bearer ${token}` } }),
          API.get("/admin/stats", { headers: { Authorization: `Bearer ${token}` } }),
          API.get("/admin/transactions", { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        setUsers(usersRes.data);
        setStats(statsRes.data);
        setTransactions(txRes.data);
      } catch (error) {
        console.log(error);
      }
      setLoading(false);
    }
    loadAdmin();
  }, [router]);

  async function handleBan(userId: string) {
    const token = localStorage.getItem("token");
    setActionLoading(userId + "-ban");
    try {
      const response = await API.patch(
        `/admin/users/${userId}/ban`, {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUsers((prev) => prev.map((u) => u._id === userId ? { ...u, role: response.data.role } : u));
      alert(response.data.message);
    } catch (error) {
      alert("Failed to update user");
    }
    setActionLoading(null);
  }

  async function handleDelete(userId: string, userName: string) {
    const confirm = window.confirm(`Are you sure you want to delete ${userName}? This cannot be undone.`);
    if (!confirm) return;
    const token = localStorage.getItem("token");
    setActionLoading(userId + "-delete");
    try {
      await API.delete(`/admin/users/${userId}`, { headers: { Authorization: `Bearer ${token}` } });
      setUsers((prev) => prev.filter((u) => u._id !== userId));
      setStats((prev) => ({ ...prev, totalUsers: prev.totalUsers - 1 }));
      alert("User deleted successfully");
    } catch (error) {
      alert("Failed to delete user");
    }
    setActionLoading(null);
  }

  const filteredUsers = users.filter(
    (u) =>
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredTransactions = transactions.filter(
    (t) => txFilter === "all" || t.type === txFilter
  );

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

        {/* HEADER */}
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

        {/* ADMIN ACCESS */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl md:rounded-3xl p-5 md:p-8 shadow-2xl mb-10">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Admin Access</h2>
          <p className="text-gray-400 text-lg">Logged in as:</p>
          <p className="text-blue-500 font-bold text-2xl mt-2">{adminEmail}</p>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-10">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl md:rounded-3xl p-5 md:p-8 shadow-xl">
            <p className="text-gray-400">Total Users</p>
            <h2 className="text-2xl md:text-5xl font-bold mt-4">{stats.totalUsers}</h2>
          </div>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl md:rounded-3xl p-5 md:p-8 shadow-xl">
            <p className="text-gray-400">Total Revenue</p>
            <h2 className="text-2xl md:text-5xl font-bold mt-4 text-green-500">
              ₦{Number(stats.totalRevenue).toLocaleString()}
            </h2>
          </div>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl md:rounded-3xl p-5 md:p-8 shadow-xl">
            <p className="text-gray-400">Transactions</p>
            <h2 className="text-2xl md:text-5xl font-bold mt-4 text-blue-500">{stats.totalTransactions}</h2>
          </div>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl md:rounded-3xl p-5 md:p-8 shadow-xl">
            <p className="text-gray-400">Platform Status</p>
            <h2 className="text-2xl md:text-5xl font-bold mt-4 text-yellow-500">LIVE</h2>
          </div>
        </div>

        {/* USERS */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl md:rounded-3xl p-5 md:p-8 shadow-2xl">

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 mb-8">
            <h2 className="text-2xl md:text-3xl font-bold">Registered Users</h2>
            <div className="flex items-center gap-4">
              <input
                type="text"
                placeholder="Search users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-[var(--input)] border border-[var(--border)] rounded-2xl px-5 py-3 outline-none focus:border-blue-500 transition w-full md:w-64"
              />
              <div className="bg-blue-600 px-5 py-3 rounded-2xl font-semibold shrink-0">
                {filteredUsers.length} Users
              </div>
            </div>
          </div>

          {filteredUsers.length === 0 && (
            <div className="bg-[var(--input)] border border-[var(--border)] rounded-2xl p-10 text-center">
              <h3 className="text-2xl font-bold">No Users Found</h3>
            </div>
          )}

          <div className="space-y-5">
            {filteredUsers.map((user) => (
              <div
                key={user._id}
                className="bg-[var(--input)] border border-[var(--border)] rounded-2xl md:rounded-3xl p-5 md:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-5"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold text-lg shrink-0">
                    {user.name?.charAt(0).toUpperCase() || "U"}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">{user.name}</h3>
                    <p className="text-gray-400 text-sm mt-1">{user.email}</p>
                    <p className="text-gray-500 text-xs mt-1">ID: {user._id}</p>
                    <p className="text-gray-500 text-xs mt-1">
                      Joined: {new Date(user.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col md:items-end gap-3">
                  <div className={`px-4 py-2 rounded-2xl text-sm font-semibold w-fit ${
                    user.role === "admin" ? "bg-blue-500/20 text-blue-500" :
                    user.role === "banned" ? "bg-red-500/20 text-red-500" :
                    "bg-green-500/20 text-green-500"
                  }`}>
                    {user.role === "admin" ? "Admin" : user.role === "banned" ? "Banned" : "Active User"}
                  </div>

                  {user.role !== "admin" && (
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleBan(user._id)}
                        disabled={actionLoading === user._id + "-ban"}
                        className={`px-4 py-2 rounded-2xl text-sm font-semibold transition ${
                          user.role === "banned" ? "bg-green-600 hover:bg-green-700" : "bg-yellow-600 hover:bg-yellow-700"
                        }`}
                      >
                        {actionLoading === user._id + "-ban" ? "..." : user.role === "banned" ? "Unban" : "Ban"}
                      </button>
                      <button
                        onClick={() => handleDelete(user._id, user.name)}
                        disabled={actionLoading === user._id + "-delete"}
                        className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-2xl text-sm font-semibold transition"
                      >
                        {actionLoading === user._id + "-delete" ? "..." : "Delete"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

        </div>

        {/* TRANSACTIONS */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl md:rounded-3xl p-5 md:p-8 shadow-2xl mt-10">

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 mb-8">
            <h2 className="text-2xl md:text-3xl font-bold">All Transactions</h2>
            <div className="flex gap-3 flex-wrap">
              {["all", "deposit", "sms_purchase"].map((f) => (
                <button
                  key={f}
                  onClick={() => setTxFilter(f)}
                  className={`px-4 py-2 rounded-2xl text-sm font-semibold transition ${
                    txFilter === f
                      ? "bg-blue-600 text-white"
                      : "bg-[var(--input)] border border-[var(--border)]"
                  }`}
                >
                  {f === "all" ? "All" : f === "deposit" ? "Deposits" : "SMS Purchases"}
                </button>
              ))}
            </div>
          </div>

          {filteredTransactions.length === 0 && (
            <div className="text-center text-gray-400 py-10">
              No transactions found
            </div>
          )}

          <div className="space-y-4">
            {filteredTransactions.map((tx) => (
              <div
                key={tx._id}
                className="bg-[var(--input)] border border-[var(--border)] rounded-2xl p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
              >
                <div>
                  <p className="font-bold text-lg">{tx.description || tx.type}</p>
                  <p className="text-gray-400 text-sm mt-1">
                    {tx.user?.name} — {tx.user?.email}
                  </p>
                  <p className="text-gray-500 text-xs mt-1">
                    {new Date(tx.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex flex-col md:items-end gap-2">
                  <p className={`text-xl font-bold ${
                    tx.type === "deposit" ? "text-green-500" : "text-blue-500"
                  }`}>
                    {tx.type === "deposit" ? "+" : "-"}₦{Number(tx.amount).toLocaleString()}
                  </p>
                  <div className={`px-3 py-1 rounded-xl text-xs font-semibold ${
                    tx.status === "successful"
                      ? "bg-green-500/20 text-green-500"
                      : tx.status === "pending"
                      ? "bg-yellow-500/20 text-yellow-500"
                      : "bg-red-500/20 text-red-500"
                  }`}>
                    {tx.status}
                  </div>
                  <div className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-xl text-xs font-semibold">
                    {tx.type === "deposit" ? "Deposit" : "SMS Purchase"}
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>

      </div>

    </main>
  );
}