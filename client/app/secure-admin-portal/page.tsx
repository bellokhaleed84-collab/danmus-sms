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
  const [balanceUserId, setBalanceUserId] = useState<string | null>(null);
  const [balanceAmount, setBalanceAmount] = useState("");
  const [balanceType, setBalanceType] = useState("add");
  const [balanceDesc, setBalanceDesc] = useState("");
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [viewTxUser, setViewTxUser] = useState<any | null>(null);

  const [listings, setListings] = useState<any[]>([]);
  const [listingFilter, setListingFilter] = useState("all");
  const [showListingForm, setShowListingForm] = useState(false);
  const [listingLoading, setListingLoading] = useState(false);
  const [listingForm, setListingForm] = useState({
    platform: "instagram",
    title: "",
    description: "",
    followers: "",
    accountAge: "",
    price: "",
    username: "",
    password: "",
    email: "",
    recoveryInfo: "",
  });
  const [listingActionLoading, setListingActionLoading] = useState<string | null>(null);

  const [serviceControls, setServiceControls] = useState<any[]>([]);
  const [controlLoading, setControlLoading] = useState<string | null>(null);

  useEffect(() => {
    async function loadAdmin() {
      const token = localStorage.getItem("token");
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      if (!token || !user?.email) { router.push("/login"); return; }
      if (user.role !== "admin") { router.push("/dashboard"); return; }
      setAdminEmail(user.email);
      try {
        const [usersRes, statsRes, txRes, listingsRes, controlsRes] = await Promise.all([
          API.get("/admin/users", { headers: { Authorization: `Bearer ${token}` } }),
          API.get("/admin/stats", { headers: { Authorization: `Bearer ${token}` } }),
          API.get("/admin/transactions", { headers: { Authorization: `Bearer ${token}` } }),
          API.get("/listings/admin/all", { headers: { Authorization: `Bearer ${token}` } }),
          API.get("/admin/service-controls", { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        setUsers(usersRes.data);
        setStats(statsRes.data);
        setTransactions(txRes.data);
        setListings(listingsRes.data);
        setServiceControls(controlsRes.data);
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

  function handleListingFormChange(e: any) {
    setListingForm({ ...listingForm, [e.target.name]: e.target.value });
  }

  async function handleCreateListing(e: any) {
    e.preventDefault();
    const token = localStorage.getItem("token");
    setListingLoading(true);
    try {
      const res = await API.post(
        "/listings",
        {
          platform: listingForm.platform,
          title: listingForm.title,
          description: listingForm.description,
          followers: Number(listingForm.followers),
          accountAge: listingForm.accountAge,
          price: Number(listingForm.price),
          credentials: {
            username: listingForm.username,
            password: listingForm.password,
            email: listingForm.email,
            recoveryInfo: listingForm.recoveryInfo,
          },
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setListings((prev) => [res.data.listing, ...prev]);
      alert("Listing created and live");
      setShowListingForm(false);
      setListingForm({
        platform: "instagram",
        title: "",
        description: "",
        followers: "",
        accountAge: "",
        price: "",
        username: "",
        password: "",
        email: "",
        recoveryInfo: "",
      });
    } catch (error: any) {
      alert(error.response?.data?.message || "Failed to create listing");
    }
    setListingLoading(false);
  }

  async function handleListingStatusChange(listingId: string, status: string) {
    const token = localStorage.getItem("token");
    setListingActionLoading(listingId + "-" + status);
    try {
      const res = await API.put(
        `/listings/${listingId}/review`,
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setListings((prev) =>
        prev.map((l) => (l._id === listingId ? { ...l, status: res.data.listing.status } : l))
      );
    } catch (error: any) {
      alert(error.response?.data?.message || "Failed to update listing");
    }
    setListingActionLoading(null);
  }

  async function handleToggleService(key: string, currentlyLocked: boolean) {
    const token = localStorage.getItem("token");
    setControlLoading(key);
    try {
      const reason = !currentlyLocked
        ? prompt("Reason for locking (optional):") || ""
        : "";
      const res = await API.patch(
        `/admin/service-controls/${key}`,
        { locked: !currentlyLocked, reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setServiceControls((prev) =>
        prev.map((c) => (c.key === key ? res.data.control : c))
      );
    } catch (error: any) {
      alert(error.response?.data?.message || "Failed to update service");
    }
    setControlLoading(null);
  }

  const filteredUsers = users.filter(
    (u) =>
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredTransactions = transactions.filter(
    (t) => txFilter === "all" || t.type === txFilter
  );

  const filteredListings = listings.filter(
    (l) => listingFilter === "all" || l.status === listingFilter
  );

  const userTransactions = viewTxUser
    ? transactions.filter((t) => t.user?._id === viewTxUser._id)
    : [];

  const listingStatusColors: any = {
    pending_review: "bg-yellow-500/20 text-yellow-500",
    active: "bg-green-500/20 text-green-500",
    sold: "bg-blue-500/20 text-blue-500",
    rejected: "bg-red-500/20 text-red-500",
    removed: "bg-gray-500/20 text-gray-400",
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-14 h-14 md:w-16 md:h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
          <h1 className="text-xl md:text-3xl font-bold">Loading Admin Panel...</h1>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] transition-all duration-300 pb-16">

      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/20 blur-[120px] rounded-full" />
      </div>

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

      {showListingForm && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center px-4 py-8 overflow-y-auto">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-6 md:p-8 w-full max-w-lg shadow-2xl my-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl md:text-2xl font-bold">Create Listing</h2>
              <button
                onClick={() => setShowListingForm(false)}
                className="bg-[var(--input)] border border-[var(--border)] px-4 py-2 rounded-2xl font-semibold text-sm"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleCreateListing} className="space-y-5">
              <div>
                <label className="block mb-2 font-semibold text-sm md:text-base">Platform</label>
                <select
                  name="platform"
                  value={listingForm.platform}
                  onChange={handleListingFormChange}
                  className="w-full bg-[var(--input)] border border-[var(--border)] rounded-2xl px-5 py-3 outline-none focus:border-blue-500"
                >
                  <option value="instagram">Instagram</option>
                  <option value="facebook">Facebook</option>
                  <option value="tiktok">TikTok</option>
                  <option value="twitter">Twitter/X</option>
                  <option value="telegram">Telegram</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block mb-2 font-semibold text-sm md:text-base">Title</label>
                <input
                  name="title"
                  value={listingForm.title}
                  onChange={handleListingFormChange}
                  required
                  className="w-full bg-[var(--input)] border border-[var(--border)] rounded-2xl px-5 py-3 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block mb-2 font-semibold text-sm md:text-base">Description</label>
                <textarea
                  name="description"
                  value={listingForm.description}
                  onChange={handleListingFormChange}
                  rows={3}
                  required
                  className="w-full bg-[var(--input)] border border-[var(--border)] rounded-2xl px-5 py-3 outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-2 font-semibold text-sm md:text-base">Followers</label>
                  <input
                    name="followers"
                    type="number"
                    value={listingForm.followers}
                    onChange={handleListingFormChange}
                    className="w-full bg-[var(--input)] border border-[var(--border)] rounded-2xl px-5 py-3 outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block mb-2 font-semibold text-sm md:text-base">Account Age</label>
                  <input
                    name="accountAge"
                    value={listingForm.accountAge}
                    onChange={handleListingFormChange}
                    placeholder="e.g. 2 years"
                    className="w-full bg-[var(--input)] border border-[var(--border)] rounded-2xl px-5 py-3 outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-2 font-semibold text-sm md:text-base">Price (₦)</label>
                <input
                  name="price"
                  type="number"
                  value={listingForm.price}
                  onChange={handleListingFormChange}
                  required
                  className="w-full bg-[var(--input)] border border-[var(--border)] rounded-2xl px-5 py-3 outline-none focus:border-blue-500"
                />
              </div>

              <hr className="border-[var(--border)]" />

              <div>
                <label className="block mb-2 font-semibold text-sm md:text-base">Username</label>
                <input
                  name="username"
                  value={listingForm.username}
                  onChange={handleListingFormChange}
                  required
                  className="w-full bg-[var(--input)] border border-[var(--border)] rounded-2xl px-5 py-3 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block mb-2 font-semibold text-sm md:text-base">Password</label>
                <input
                  name="password"
                  type="password"
                  value={listingForm.password}
                  onChange={handleListingFormChange}
                  required
                  className="w-full bg-[var(--input)] border border-[var(--border)] rounded-2xl px-5 py-3 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block mb-2 font-semibold text-sm md:text-base">Recovery Email (optional)</label>
                <input
                  name="email"
                  value={listingForm.email}
                  onChange={handleListingFormChange}
                  className="w-full bg-[var(--input)] border border-[var(--border)] rounded-2xl px-5 py-3 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block mb-2 font-semibold text-sm md:text-base">Other Recovery Info (optional)</label>
                <input
                  name="recoveryInfo"
                  value={listingForm.recoveryInfo}
                  onChange={handleListingFormChange}
                  className="w-full bg-[var(--input)] border border-[var(--border)] rounded-2xl px-5 py-3 outline-none focus:border-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={listingLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 py-4 rounded-2xl font-bold transition disabled:opacity-50"
              >
                {listingLoading ? "Creating..." : "Create Listing"}
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-10">

        <div className="flex flex-col gap-5 mb-8 md:mb-10 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl md:text-5xl font-bold">Admin Dashboard</h1>
            <p className="text-gray-400 mt-2 md:mt-3 text-sm md:text-lg">Manage your Danmus SMS platform</p>
          </div>
          <div className="grid grid-cols-2 gap-3 md:flex md:gap-4">
            <Link href="/dashboard" className="w-full">
              <button className="w-full bg-blue-600 hover:bg-blue-700 px-4 md:px-6 py-3 rounded-2xl font-semibold text-sm md:text-base transition shadow-xl">
                User Dashboard
              </button>
            </Link>
            <button
              onClick={() => { localStorage.clear(); router.push("/login"); }}
              className="w-full bg-red-600 hover:bg-red-700 px-4 md:px-6 py-3 rounded-2xl font-semibold text-sm md:text-base transition shadow-xl"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl md:rounded-3xl p-5 md:p-8 shadow-2xl mb-8 md:mb-10">
          <h2 className="text-lg md:text-3xl font-bold mb-3 md:mb-4">Admin Access</h2>
          <p className="text-gray-400 text-sm md:text-lg">Logged in as:</p>
          <p className="text-blue-500 font-bold text-lg md:text-2xl mt-1 md:mt-2 truncate">{adminEmail}</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-8 md:mb-10">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl md:rounded-3xl p-4 md:p-8 shadow-xl">
            <p className="text-gray-400 text-xs md:text-base">Total Users</p>
            <h2 className="text-xl md:text-5xl font-bold mt-2 md:mt-4">{stats.totalUsers}</h2>
          </div>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl md:rounded-3xl p-4 md:p-8 shadow-xl">
            <p className="text-gray-400 text-xs md:text-base">Total Revenue</p>
            <h2 className="text-xl md:text-5xl font-bold mt-2 md:mt-4 text-green-500 truncate">
              ₦{Number(stats.totalRevenue).toLocaleString()}
            </h2>
          </div>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl md:rounded-3xl p-4 md:p-8 shadow-xl">
            <p className="text-gray-400 text-xs md:text-base">Transactions</p>
            <h2 className="text-xl md:text-5xl font-bold mt-2 md:mt-4 text-blue-500">{stats.totalTransactions}</h2>
          </div>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl md:rounded-3xl p-4 md:p-8 shadow-xl">
            <p className="text-gray-400 text-xs md:text-base">Platform Status</p>
            <h2 className="text-xl md:text-5xl font-bold mt-2 md:mt-4 text-yellow-500">LIVE</h2>
          </div>
        </div>

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl md:rounded-3xl p-4 md:p-8 shadow-2xl">

          <div className="flex flex-col gap-4 mb-6 md:mb-8 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl md:text-3xl font-bold">Registered Users</h2>
              <div className="bg-blue-600 px-3 py-2 md:px-5 md:py-3 rounded-2xl font-semibold text-xs md:text-base shrink-0 md:hidden">
                {filteredUsers.length}
              </div>
            </div>
            <div className="flex items-center gap-3 md:gap-4">
              <input
                type="text"
                placeholder="Search users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-[var(--input)] border border-[var(--border)] rounded-2xl px-4 md:px-5 py-2.5 md:py-3 text-sm md:text-base outline-none focus:border-blue-500 transition w-full md:w-64"
              />
              <div className="hidden md:block bg-blue-600 px-5 py-3 rounded-2xl font-semibold shrink-0">
                {filteredUsers.length} Users
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
                className="bg-[var(--input)] border border-[var(--border)] rounded-2xl md:rounded-3xl p-4 md:p-6"
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

        </div>

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl md:rounded-3xl p-4 md:p-8 shadow-2xl mt-8 md:mt-10">

          <div className="flex flex-col gap-4 mb-6 md:mb-8 md:flex-row md:items-center md:justify-between">
            <h2 className="text-xl md:text-3xl font-bold">All Transactions</h2>
            <div className="flex gap-2 md:gap-3 overflow-x-auto pb-1 -mx-1 px-1 md:flex-wrap md:overflow-visible">
              {["all", "deposit", "sms_purchase", "marketplace_purchase"].map((f) => (
                <button
                  key={f}
                  onClick={() => setTxFilter(f)}
                  className={`px-3 md:px-4 py-2 rounded-2xl text-xs md:text-sm font-semibold transition shrink-0 ${
                    txFilter === f
                      ? "bg-blue-600 text-white"
                      : "bg-[var(--input)] border border-[var(--border)]"
                  }`}
                >
                  {f === "all"
                    ? "All"
                    : f === "deposit"
                    ? "Deposits"
                    : f === "sms_purchase"
                    ? "SMS"
                    : "Marketplace"}
                </button>
              ))}
            </div>
          </div>

          {filteredTransactions.length === 0 && (
            <div className="text-center text-gray-400 py-10 text-sm">
              No transactions found
            </div>
          )}

          <div className="space-y-3 md:space-y-4">
            {filteredTransactions.map((tx) => (
              <div
                key={tx._id}
                className="bg-[var(--input)] border border-[var(--border)] rounded-2xl p-4 md:p-5 flex items-start justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="font-bold text-sm md:text-lg truncate">{tx.description || tx.type}</p>
                  <p className="text-gray-400 text-xs md:text-sm mt-1 truncate">
                    {tx.user?.name} — {tx.user?.email}
                  </p>
                  <p className="text-gray-500 text-[11px] md:text-xs mt-1">
                    {new Date(tx.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1.5 md:gap-2 shrink-0">
                  <p className={`text-base md:text-xl font-bold whitespace-nowrap ${
                    tx.type === "deposit" ? "text-green-500" : "text-blue-500"
                  }`}>
                    {tx.type === "deposit" ? "+" : "-"}₦{Number(tx.amount).toLocaleString()}
                  </p>
                  <div className={`px-2 md:px-3 py-1 rounded-xl text-[11px] md:text-xs font-semibold ${
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

        </div>

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl md:rounded-3xl p-4 md:p-8 shadow-2xl mt-8 md:mt-10">

          <div className="flex flex-col gap-4 mb-6 md:mb-8 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl md:text-3xl font-bold">Marketplace Listings</h2>
              <button
                onClick={() => setShowListingForm(true)}
                className="bg-blue-600 hover:bg-blue-700 px-4 py-2.5 rounded-2xl font-semibold text-xs md:text-base transition shrink-0 md:hidden"
              >
                + New
              </button>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex gap-2 md:gap-3 overflow-x-auto pb-1 -mx-1 px-1 md:flex-wrap md:overflow-visible">
                {["all", "pending_review", "active", "sold", "rejected", "removed"].map((f) => (
                  <button
                    key={f}
                    onClick={() => setListingFilter(f)}
                    className={`px-3 md:px-4 py-2 rounded-2xl text-xs md:text-sm font-semibold transition shrink-0 capitalize ${
                      listingFilter === f
                        ? "bg-blue-600 text-white"
                        : "bg-[var(--input)] border border-[var(--border)]"
                    }`}
                  >
                    {f === "all" ? "All" : f.replace("_", " ")}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowListingForm(true)}
                className="hidden md:block bg-blue-600 hover:bg-blue-700 px-5 py-3 rounded-2xl font-semibold transition shrink-0"
              >
                + New Listing
              </button>
            </div>
          </div>

          {filteredListings.length === 0 && (
            <div className="bg-[var(--input)] border border-[var(--border)] rounded-2xl p-8 md:p-10 text-center">
              <h3 className="text-lg md:text-2xl font-bold">No Listings Found</h3>
            </div>
          )}

          <div className="space-y-3 md:space-y-4">
            {filteredListings.map((listing) => (
              <div
                key={listing._id}
                className="bg-[var(--input)] border border-[var(--border)] rounded-2xl p-4 md:p-5"
              >
                <span className="inline-block bg-blue-600/20 text-blue-400 text-[11px] md:text-xs font-bold px-3 py-1 rounded-full uppercase mb-2">
                  {listing.platform}
                </span>
                <div className={`px-3 py-1 rounded-xl text-xs font-semibold w-fit capitalize mb-2 ${listingStatusColors[listing.status]}`}>
                  {listing.status.replace("_", " ")}
                </div>
                <h3 className="font-bold text-base md:text-lg truncate">{listing.title}</h3>
                <p className="text-gray-400 text-xs md:text-sm mt-1">
                  ₦{Number(listing.price).toLocaleString()} · {listing.followers?.toLocaleString() || 0} followers
                </p>
                <p className="text-gray-500 text-[11px] md:text-xs mt-1">
                  Created: {new Date(listing.createdAt).toLocaleString()}
                </p>

                <div className="flex gap-2 flex-wrap mt-3">
                  {listing.status !== "active" && listing.status !== "sold" && (
                    <button
                      onClick={() => handleListingStatusChange(listing._id, "active")}
                      disabled={listingActionLoading === listing._id + "-active"}
                      className="bg-green-600 hover:bg-green-700 px-3 py-2 rounded-xl text-xs font-semibold transition"
                    >
                      {listingActionLoading === listing._id + "-active" ? "..." : "Activate"}
                    </button>
                  )}
                  {listing.status !== "removed" && listing.status !== "sold" && (
                    <button
                      onClick={() => handleListingStatusChange(listing._id, "removed")}
                      disabled={listingActionLoading === listing._id + "-removed"}
                      className="bg-red-600 hover:bg-red-700 px-3 py-2 rounded-xl text-xs font-semibold transition"
                    >
                      {listingActionLoading === listing._id + "-removed" ? "..." : "Remove"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

        </div>

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl md:rounded-3xl p-4 md:p-8 shadow-2xl mt-8 md:mt-10">
          <h2 className="text-xl md:text-3xl font-bold mb-6 md:mb-8">Service Controls</h2>

          {serviceControls.length === 0 && (
            <div className="bg-[var(--input)] border border-[var(--border)] rounded-2xl p-8 md:p-10 text-center">
              <h3 className="text-lg md:text-2xl font-bold">No Services Found</h3>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {serviceControls.map((control) => (
              <div
                key={control.key}
                className={`border rounded-2xl p-4 ${
                  control.locked
                    ? "bg-red-500/10 border-red-500/40"
                    : "bg-[var(--input)] border-[var(--border)]"
                }`}
              >
                <p className="font-semibold text-sm truncate">{control.label}</p>
                <p className="text-gray-500 text-[11px] mt-1 uppercase">{control.type}</p>
                {control.locked && control.reason && (
                  <p className="text-red-400 text-[11px] mt-2 truncate">{control.reason}</p>
                )}
                <button
                  onClick={() => handleToggleService(control.key, control.locked)}
                  disabled={controlLoading === control.key}
                  className={`w-full mt-3 py-2 rounded-xl text-xs font-semibold transition ${
                    control.locked
                      ? "bg-green-600 hover:bg-green-700"
                      : "bg-red-600 hover:bg-red-700"
                  }`}
                >
                  {controlLoading === control.key
                    ? "..."
                    : control.locked
                    ? "Unlock"
                    : "Lock"}
                </button>
              </div>
            ))}
          </div>
        </div>

      </div>

    </main>
  );
}