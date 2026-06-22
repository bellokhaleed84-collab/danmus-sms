"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MobileNav from "@/components/MobileNav";

export default function SettingsPage() {

  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");
  const [loading, setLoading] = useState(true);

  /* LOAD USER DATA */
  useEffect(() => {
    async function fetchUserData() {
      try {
        const token = localStorage.getItem("token");
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        if (!token || !user?.email) {
          setLoading(false);
          return;
        }
        setEmail(user.email || "");
        setFullName(user.name || "");
        setUsername(user.name || "");
      } catch (error) {
        console.log(error);
      } finally {
        setLoading(false);
      }
    }
    fetchUserData();
  }, []);

  /* LOAD THEME */
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (!savedTheme) {
      localStorage.setItem("theme", "light");
      document.documentElement.classList.remove("dark");
      setDarkMode(false);
      return;
    }
    if (savedTheme === "dark") {
      document.documentElement.classList.add("dark");
      setDarkMode(true);
    } else {
      document.documentElement.classList.remove("dark");
      setDarkMode(false);
    }
  }, []);

  /* TOGGLE THEME */
  function handleThemeToggle() {
    if (darkMode) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setDarkMode(false);
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setDarkMode(true);
    }
  }

  /* SAVE SETTINGS */
  async function handleSave() {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("User not logged in");
        return;
      }
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      user.name = fullName;
      localStorage.setItem("user", JSON.stringify(user));
      setSavedMessage("Settings saved successfully!");
      setTimeout(() => setSavedMessage(""), 3000);
    } catch (error) {
      console.log(error);
      alert("Something went wrong");
    }
  }

  /* LOGOUT */
  function handleLogout() {
    localStorage.clear();
    router.push("/login");
  }

  /* DELETE ACCOUNT */
  function handleDeleteAccount() {
    const confirmDelete = confirm("Are you sure you want to delete your account?");
    if (confirmDelete) {
      alert("Account deletion request submitted");
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[var(--background)] text-[var(--foreground)]">
        Loading...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] px-4 md:px-6 py-6 md:py-10 transition-all duration-300">

      {/* BACKGROUND EFFECTS */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/20 blur-[120px] rounded-full" />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-indigo-500/10 blur-[100px] rounded-full" />
      </div>

      <div className="max-w-2xl mx-auto">

        {/* TOP HEADER */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 mb-10">

          <div>
            <h1 className="text-3xl md:text-5xl font-bold">Settings</h1>
            <p className="text-gray-400 mt-2 text-base md:text-lg">Manage your Danmus SMS account</p>
          </div>

          <Link href="/dashboard">
            <button title="Back Dashboard" className="bg-blue-600 hover:bg-blue-700 px-5 py-3 rounded-2xl font-semibold transition shadow-lg text-sm md:text-base">
              ← Back Dashboard
            </button>
          </Link>

        </div>

        {/* SUCCESS MESSAGE */}
        {savedMessage && (
          <div className="bg-green-600/20 border border-green-600 text-green-400 mb-6 p-4 rounded-2xl shadow-xl text-center font-semibold">
            ✅ {savedMessage}
          </div>
        )}

        <div className="space-y-6">

          {/* PROFILE */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-6 md:p-8 shadow-xl">

            <div className="flex items-center gap-5 mb-8">
              <div className="w-20 h-20 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center text-3xl font-bold text-white shadow-xl shrink-0">
                {username ? username.charAt(0).toUpperCase() : "U"}
              </div>
              <div>
                <h2 className="text-2xl font-bold">{username || "User"}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-2 h-2 rounded-full bg-green-400" />
                  <p className="text-green-400 text-sm">Verified User</p>
                </div>
              </div>
            </div>

            <h3 className="text-lg font-bold mb-5 text-gray-300">Profile Information</h3>

            <div className="grid md:grid-cols-2 gap-5">

              <div>
                <label className="block mb-2 text-sm font-medium text-gray-400">Full Name</label>
                <input
                  title="Full Name"
                  type="text"
                  placeholder="Enter full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-[var(--input)] border border-[var(--border)] rounded-2xl px-4 py-3 outline-none focus:border-blue-500 transition text-sm"
                />
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium text-gray-400">Username</label>
                <input
                  title="Username"
                  type="text"
                  placeholder="Enter username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-[var(--input)] border border-[var(--border)] rounded-2xl px-4 py-3 outline-none focus:border-blue-500 transition text-sm"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block mb-2 text-sm font-medium text-gray-400">Email Address</label>
                <input
                  title="Email Address"
                  type="email"
                  placeholder="Your email"
                  value={email}
                  readOnly
                  className="w-full bg-[var(--input)] border border-[var(--border)] rounded-2xl px-4 py-3 opacity-60 cursor-not-allowed text-sm"
                />
              </div>

            </div>

          </div>

          {/* NOTIFICATIONS */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-6 md:p-8 shadow-xl">

            <h2 className="text-lg font-bold mb-6 text-gray-300">Notifications</h2>

            <div className="space-y-4">

              <div className="bg-[var(--input)] border border-[var(--border)] rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Email Notifications</h3>
                  <p className="text-gray-400 text-xs mt-1">Receive account activity alerts</p>
                </div>
                <button
                  title="Toggle Email Notifications"
                  onClick={() => setEmailNotifications(!emailNotifications)}
                  className={`w-14 h-8 rounded-full transition-all relative shrink-0 ${emailNotifications ? "bg-green-500" : "bg-gray-600"}`}
                >
                  <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-all ${emailNotifications ? "translate-x-7" : "translate-x-1"}`} />
                </button>
              </div>

              <div className="bg-[var(--input)] border border-[var(--border)] rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">SMS Notifications</h3>
                  <p className="text-gray-400 text-xs mt-1">Receive SMS alerts instantly</p>
                </div>
                <button
                  title="Toggle SMS Notifications"
                  onClick={() => setSmsNotifications(!smsNotifications)}
                  className={`w-14 h-8 rounded-full transition-all relative shrink-0 ${smsNotifications ? "bg-green-500" : "bg-gray-600"}`}
                >
                  <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-all ${smsNotifications ? "translate-x-7" : "translate-x-1"}`} />
                </button>
              </div>

            </div>

          </div>

          {/* APPEARANCE */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-6 md:p-8 shadow-xl">

            <h2 className="text-lg font-bold mb-6 text-gray-300">Appearance</h2>

            <div className="bg-[var(--input)] border border-[var(--border)] rounded-2xl p-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Dark Mode</h3>
                <p className="text-gray-400 text-xs mt-1">Switch between light and dark themes</p>
              </div>
              <button
                title="Toggle Dark Mode"
                onClick={handleThemeToggle}
                className={`w-14 h-8 rounded-full transition-all relative shrink-0 ${darkMode ? "bg-blue-600" : "bg-gray-600"}`}
              >
                <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-all ${darkMode ? "translate-x-7" : "translate-x-1"}`} />
              </button>
            </div>

          </div>

          {/* HELP & SUPPORT */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-6 md:p-8 shadow-xl">

            <h2 className="text-lg font-bold mb-6 text-gray-300">Help &amp; Support</h2>

            <div className="space-y-4">

              <a
                href="mailto:danmussms@gmail.com"
                className="bg-[var(--input)] border border-[var(--border)] rounded-2xl p-4 flex items-center gap-4 hover:border-blue-500 transition group"
              >
                <div className="w-11 h-11 rounded-2xl bg-blue-600/20 flex items-center justify-center text-xl shrink-0 group-hover:bg-blue-600/30 transition">
                  📧
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Email Support</h3>
                  <p className="text-gray-400 text-xs mt-1">danmussms@gmail.com</p>
                </div>
                <div className="ml-auto text-gray-500 text-lg">›</div>
              </a>

              <a
                href="https://whatsapp.com/channel/0029Vb8N0VeAojYsaAlNz83R"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[var(--input)] border border-[var(--border)] rounded-2xl p-4 flex items-center gap-4 hover:border-green-500 transition group"
              >
                <div className="w-11 h-11 rounded-2xl bg-green-600/20 flex items-center justify-center text-xl shrink-0 group-hover:bg-green-600/30 transition">
                  💬
                </div>
                <div>
                  <h3 className="font-semibold text-sm">WhatsApp Support</h3>
                  <p className="text-gray-400 text-xs mt-1">Chat with us on WhatsApp</p>
                </div>
                <div className="ml-auto text-gray-500 text-lg">›</div>
              </a>

              <a
                href="https://t.me/Danmus_Sms"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[var(--input)] border border-[var(--border)] rounded-2xl p-4 flex items-center gap-4 hover:border-sky-500 transition group"
              >
                <div className="w-11 h-11 rounded-2xl bg-sky-600/20 flex items-center justify-center text-xl shrink-0 group-hover:bg-sky-600/30 transition">
                  ✈️
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Telegram Support</h3>
                  <p className="text-gray-400 text-xs mt-1">Message us on Telegram</p>
                </div>
                <div className="ml-auto text-gray-500 text-lg">›</div>
              </a>

            </div>

          </div>

          {/* SECURITY */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-6 md:p-8 shadow-xl">

            <h2 className="text-lg font-bold mb-6 text-gray-300">Security</h2>

            <div className="space-y-4">

              <div className="bg-[var(--input)] border border-[var(--border)] rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-600/20 flex items-center justify-center text-lg shrink-0">
                    🛡️
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Account Status</p>
                    <p className="text-green-400 text-xs mt-1">Verified &amp; Active</p>
                  </div>
                </div>
                <div className="bg-green-500/20 text-green-400 px-3 py-1 rounded-xl text-xs font-semibold shrink-0">
                  Active
                </div>
              </div>

              <Link href="/forgot-password">
                <button
                  title="Change Password"
                  className="w-full bg-[var(--input)] border border-[var(--border)] hover:border-yellow-500 py-4 rounded-2xl font-semibold transition flex items-center justify-center gap-3 text-sm mt-1"
                >
                  <span className="text-lg">🔑</span> Change Password
                </button>
              </Link>

              <button
                title="Logout"
                onClick={handleLogout}
                className="w-full bg-[var(--input)] border border-[var(--border)] hover:border-red-500 hover:text-red-400 py-4 rounded-2xl font-semibold transition flex items-center justify-center gap-3 text-sm"
              >
                <span className="text-lg">🚪</span> Logout
              </button>

            </div>

          </div>

          {/* SAVE BUTTON */}
          <button
            title="Save Settings"
            onClick={handleSave}
            className="w-full bg-blue-600 hover:bg-blue-700 py-4 rounded-2xl text-base font-bold transition shadow-xl"
          >
            Save Changes
          </button>

          {/* DANGER ZONE */}
          <div className="bg-red-950/50 border border-red-800/50 rounded-3xl p-6 md:p-8 shadow-xl">

            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">⚠️</span>
              <h2 className="text-xl font-bold text-red-400">Danger Zone</h2>
            </div>

            <p className="text-gray-400 text-sm mb-6 leading-7">
              Deleting your account is permanent and cannot be undone.
              All your data, wallet balance and transaction history will be lost forever.
            </p>

            <button
              title="Delete Account"
              onClick={handleDeleteAccount}
              className="bg-red-600/20 hover:bg-red-600 border border-red-600 text-red-400 hover:text-white px-6 py-3 rounded-2xl font-semibold transition flex items-center gap-2 text-sm"
            >
              <span>🗑️</span> Delete Account
            </button>

          </div>

        </div>

      </div>

      <MobileNav />

    </main>
  );
}