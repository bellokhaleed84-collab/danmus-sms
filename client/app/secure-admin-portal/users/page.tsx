"use client";

import { useEffect, useState } from "react";
import API from "@/lib/api";

export default function AdminUsersPage() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [balanceUserId, setBalanceUserId] = useState<string | null>(null);
  const [balanceAmount, setBalanceAmount] = useState("");
  const [balanceType, setBalanceType] = useState("add");
  const [balanceDesc, setBalanceDesc] = useState("");
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [viewTxUser, setViewTxUser] = useState<any | null>(null);

  useEffect(() => {
    async function load() {
      const token = localStorage.getItem("token");
      try {
        const [usersRes, txRes] = await Promise.all([
          API.get("/admin/users", { headers: { Authorization: `Bearer ${token}` } }),
          API.get("/admin/transactions", { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        setUsers(usersRes.data);
        setTransactions(txRes.data);
      } catch (error) {
        console.log(error);
      }
      setLoading(false);
    }
    load();
  }, []);

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
      alert("User deleted successfully");
    } catch (error) {
      alert("Failed to delete user");
    }
    setActionLoading(null);
  }

  async function handleAdjustBalance() {
    if (!balanceUserId || !balanceAmount) {
      alert("Please enter an amount");
      return;
    }
    const token = localStorage.getItem("token");
    setBalanceLoading(true);
    try {
      const response = await API.patch(
        `/admin/users/${balanceUserId}/balance`,
        { amount: balanceAmount, type: balanceType, description: balanceDesc },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUsers((prev) => prev.map((u) =>
        u._id === balanceUserId ? { ...u, balance: response.data.balance } : u
      ));
      alert(response.data.message);
      setBalanceUserId(null);
      setBalanceAmount("");
      setBalanceDesc("");
      setBalanceType("add");
    } catch (error: any) {
      alert(error.response?.data?.message || "Failed to adjust balance");
    }
    setBalanceLoading(false);
  }

  const filteredUsers = users.filter(
    (u) =>
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const userTransactions = viewTxUser
    ? transactions.filter((t) => t.user?._id === viewTxUser._id)
    : [];

  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="w-14 h-14 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
        <h1 className="text-xl font-bold">Loading users...</h1>
      </div>
    );
  }

  return (
    <>
      {balanceUserId && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center px-4">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-6 md:p-8 w-full max-w-md shadow-2xl">
            <h2 className="text-xl md:text-2xl font-bold mb-6">Adjust Wallet Balance</h2>
            <div className="space-y-5">
              <div>
                <label className="block mb-2 font-medium text-sm md:text-base">Type</label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setBalanceType("add")}
                    className={`flex-1 py-3 rounded-2xl font-semibold text-sm md:text-base transition ${
                      balanceType === "add" ? "bg-green-600" : "bg-[var(--input)] border border-[var(--border)]"
                    }`}
                  >
                    Add Balance
                  </button>
                  <button
                    onClick={() => setBalanceType("deduct")}
                    className={`flex-1 py-3 rounded-2xl font-semibold text-sm md:text-base transition ${
                      balanceType === "deduct" ? "bg-red-600" : "bg-[var(--input)] border border-[var(--border)]"
                    }`}
                  >
                    Deduct Balance
                  </button>
                </div>
              </div>
              <div>
                <label className="block mb-2 font-medium text-sm md:text-base">Amount (₦)</label>
                <input
                  type="number"
                  placeholder="Enter amount"
                  value={balanceAmount}
                  onChange={(e) => setBalanceAmount(e.target.value)}
                  className="w-full bg-[var(--input)] border border-[var(--border)] rounded-2xl px-5 py-3 md:py-4 outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block mb-2 font-medium text-sm md:text-base">Description (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Bonus credit"
                  value={balanceDesc}
                  onChange={(e) => setBalanceDesc(e.target.value)}
                  className="w-full bg-[var(--input)] border border-[var(--border)] rounded-2xl px-5 py-3 md:py-4 outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={handleAdjustBalance}
                  disabled={balanceLoading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 py-3 md:py-4 rounded-2xl font-bold text-sm md:text-base transition"
                >
                  {balanceLoading ? "Updating..." : "Confirm"}
                </button>
                <button
                  onClick={() => { setBalanceUserId(null); setBalanceAmount(""); setBalanceDesc(""); }}
                  className="flex-1 bg-[var(--input)] border border-[var(--border)] py-3 md:py-4 rounded-2xl font-bold text-sm md:text-base transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewTxUser && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center px-4">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-6 md:p-8 w-full max-w-lg shadow-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3 mb-6">
              <div className="min-w-0">
                <h2 className="text-xl md:text-2xl font-bold truncate">{viewTxUser.name}</h2>
                <p className="text-gray-400 text-xs md:text-sm mt-1 truncate">{viewTxUser.email}</p>
              </div>
              <button
                onClick={() => setViewTxUser(null)}
                className="bg-[var(--input)] border border-[var(--border)] px-4 py-2 rounded-2xl font-semibold text-sm shrink-0"
              >
                Close
              </button>
            </div>

            <div className="bg-[var(--input)] border border-[var(--border)] rounded-2xl p-4 mb-6">
              <p className="text-gray-400 text-sm">Wallet Balance</p>
              <p className="text-green-400 text-xl md:text-2xl font-bold mt-1">
                ₦{Number(viewTxUser.balance || 0).toLocaleString()}
              </p>
            </div>

            <h3 className="text-base md:text-lg font-bold mb-4">Transaction History</h3>

            {userTransactions.length === 0 ? (
              <div className="text-center text-gray-400 py-10 text-sm">
                No transactions found for this user
              </div>
            ) : (
              <div className="space-y-4">
                {userTransactions.map((tx) => (
                  <div
                    key={tx._id}
                    className="bg-[var(--input)] border border-[var(--border)] rounded-2xl p-4 flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-sm md:text-base truncate">{tx.description || tx.type}</p>
                      <p className="text-gray-500 text-xs mt-1">
                        {new Date(tx.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <p className={`font-bold text-sm md:text-base ${
                        tx.type === "deposit" ? "text-green-500" : "text-blue-500"
                      }`}>
                        {tx.type === "deposit" ? "+" : "-"}₦{Number(tx.amount).toLocaleString()}
                      </p>
                      <div className={`px-2 py-1 rounded-lg text-xs font-semibold ${
                        tx.status === "successful"
                          ? "bg-green-500/20 text-green-500"
                          : tx.status === "pending"
                          ? "bg-yellow-500/20 text-yellow-500"
                          : "bg-red-500/20 text-red-500"
                      }`}>
                        {tx.status}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4 mb-6 md:mb-8 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl md:text-4xl font-bold">Users</h1>
        <div className="flex items-center gap-3 md:gap-4">
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-[var(--input)] border border-[var(--border)] rounded-2xl px-4 md:px-5 py-2.5 md:py-3 text-sm md:text-base outline-none focus:border-blue-500 transition w-full md:w-64"
          />
          <div className="bg-blue-600 px-4 md:px-5 py-2.5 md:py-3 rounded-2xl font-semibold text-sm shrink-0">
            {filteredUsers.length}
          </div>
        </div>
      </div>

      {filteredUsers.length === 0 && (
        <div className="bg-[var(--input)] border border-[var(--border)] rounded-2xl p-8 md:p-10 text-center">
          <h3 className="text-lg md:text-2xl font-bold">No Users Found</h3>
        </div>
      )}

      <div className="space-y-4 md:space-y-5">
        {filteredUsers.map((user) => (
          <div
            key={user._id}
            className="bg-[var(--card)] border border-[var(--border)] rounded-2xl md:rounded-3xl p-4 md:p-6"
          >
            <div className="flex items-start gap-3 md:gap-4">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold text-base md:text-lg shrink-0">
                {user.name?.charAt(0).toUpperCase() || "U"}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-base md:text-lg font-bold truncate">{user.name}</h3>
                  <div className={`px-3 py-1 rounded-xl text-xs font-semibold w-fit shrink-0 ${
                    user.role === "admin" ? "bg-blue-500/20 text-blue-500" :
                    user.role === "banned" ? "bg-red-500/20 text-red-500" :
                    "bg-green-500/20 text-green-500"
                  }`}>
                    {user.role === "admin" ? "Admin" : user.role === "banned" ? "Banned" : "Active"}
                  </div>
                </div>
                <p className="text-gray-400 text-xs md:text-sm mt-1 truncate">{user.email}</p>
                <p className="text-gray-500 text-[11px] md:text-xs mt-1 truncate">ID: {user._id}</p>
                <p className="text-gray-500 text-[11px] md:text-xs mt-1">
                  Joined: {new Date(user.createdAt).toLocaleDateString()}
                </p>
                <p className="text-green-400 text-sm font-semibold mt-1">
                  Balance: ₦{Number(user.balance || 0).toLocaleString()}
                </p>
              </div>
            </div>

            {user.role !== "admin" && (
              <div className="grid grid-cols-2 gap-2 mt-4 md:flex md:flex-wrap md:gap-3">
                <button
                  onClick={() => setViewTxUser(user)}
                  className="bg-blue-600 hover:bg-blue-700 px-3 py-2.5 rounded-xl text-xs md:text-sm font-semibold transition"
                >
                  Transactions
                </button>
                <button
                  onClick={() => setBalanceUserId(user._id)}
                  className="bg-purple-600 hover:bg-purple-700 px-3 py-2.5 rounded-xl text-xs md:text-sm font-semibold transition"
                >
                  Adjust Balance
                </button>
                <button
                  onClick={() => handleBan(user._id)}
                  disabled={actionLoading === user._id + "-ban"}
                  className={`px-3 py-2.5 rounded-xl text-xs md:text-sm font-semibold transition ${
                    user.role === "banned" ? "bg-green-600 hover:bg-green-700" : "bg-yellow-600 hover:bg-yellow-700"
                  }`}
                >
                  {actionLoading === user._id + "-ban" ? "..." : user.role === "banned" ? "Unban" : "Ban"}
                </button>
                <button
                  onClick={() => handleDelete(user._id, user.name)}
                  disabled={actionLoading === user._id + "-delete"}
                  className="bg-red-600 hover:bg-red-700 px-3 py-2.5 rounded-xl text-xs md:text-sm font-semibold transition"
                >
                  {actionLoading === user._id + "-delete" ? "..." : "Delete"}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}