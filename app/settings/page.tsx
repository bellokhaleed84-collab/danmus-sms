"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import MobileNav from "@/components/MobileNav";

export default function SettingsPage() {

  const router = useRouter();

  const [fullName, setFullName] = useState("");

  const [username, setUsername] = useState("");

  const [email, setEmail] = useState("");

  const [emailNotifications, setEmailNotifications] =
    useState(true);

  const [smsNotifications, setSmsNotifications] =
    useState(false);

  const [darkMode, setDarkMode] = useState(false);

  const [savedMessage, setSavedMessage] =
    useState("");

  const [loading, setLoading] = useState(true);

  /* LOAD USER DATA */
  useEffect(() => {

    async function fetchUserData() {

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {

        router.push("/login");

        return;
      }

      setEmail(user.email || "");

      const { data, error } =
        await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

      if (data) {

        setFullName(data.full_name || "");

        setUsername(data.username || "");
      }

      if (error) {

        console.log(error);
      }

      setLoading(false);
    }

    fetchUserData();

  }, [router]);

  /* LOAD THEME */
  useEffect(() => {

    const savedTheme =
      localStorage.getItem("theme");

    if (savedTheme === "dark") {

      setDarkMode(true);

      document.documentElement.classList.add("dark");

    } else {

      setDarkMode(false);

      document.documentElement.classList.remove("dark");
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

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { error } =
      await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          username: username,
        })
        .eq("id", user.id);

    if (error) {

      alert("Failed to save settings");

      console.log(error);

      return;
    }

    setSavedMessage(
      "Settings saved successfully!"
    );

    setTimeout(() => {

      setSavedMessage("");

    }, 3000);
  }

  /* LOGOUT */
  async function handleLogout() {

    await supabase.auth.signOut();

    router.push("/login");
  }

  /* DELETE ACCOUNT */
  function handleDeleteAccount() {

    const confirmDelete = confirm(
      "Are you sure you want to delete your account?"
    );

    if (confirmDelete) {

      alert("Account deletion request submitted");
    }
  }

  if (loading) {

    return (

      <main className="min-h-screen flex items-center justify-center bg-[var(--background)] text-white">

        Loading...

      </main>
    );
  }

  return (

    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] px-4 md:px-6 py-6 md:py-10 transition-all duration-300">

      <div className="max-w-5xl mx-auto">

        {/* TOP HEADER */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 mb-10">

          <div>

            <h1 className="text-2xl md:text-5xl font-bold">
              Settings
            </h1>

            <p className="text-gray-400 mt-3 text-lg">
              Manage your Danmus SMS account
            </p>

          </div>

          <Link href="/dashboard">

            <button
              title="Back Dashboard"
              className="bg-blue-600 hover:bg-blue-700 px-4 md:px-6 py-3 rounded-2xl font-semibold transition shadow-lg"
            >
              Back Dashboard
            </button>

          </Link>

        </div>

        {/* SUCCESS MESSAGE */}
        {savedMessage && (

          <div className="bg-green-600 text-white mb-6 p-5 rounded-2xl shadow-xl">

            {savedMessage}

          </div>

        )}

        <div className="space-y-8">

          {/* PROFILE */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-5 md:p-8 shadow-xl">

            <div className="flex flex-col md:flex-row md:items-center gap-6 mb-10">

              {/* AVATAR */}
              <div className="w-24 h-24 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center text-4xl font-bold text-white shadow-xl">

                {username.charAt(0).toUpperCase()}

              </div>

              <div>

                <h2 className="text-3xl font-bold">
                  {username}
                </h2>

                <p className="text-green-400 mt-2">
                  Verified User
                </p>

              </div>

            </div>

            <h3 className="text-2xl font-bold mb-6">
              Profile Information
            </h3>

            <div className="grid md:grid-cols-2 gap-6">

              {/* FULL NAME */}
              <div>

                <label className="block mb-2 font-medium">
                  Full Name
                </label>

                <input
                  title="Full Name"
                  type="text"
                  placeholder="Enter full name"
                  value={fullName}
                  onChange={(e) =>
                    setFullName(e.target.value)
                  }
                  className="w-full bg-[var(--input)] border border-[var(--border)] rounded-2xl px-5 py-4 outline-none focus:border-blue-500 transition"
                />

              </div>

              {/* USERNAME */}
              <div>

                <label className="block mb-2 font-medium">
                  Username
                </label>

                <input
                  title="Username"
                  type="text"
                  placeholder="Enter username"
                  value={username}
                  onChange={(e) =>
                    setUsername(e.target.value)
                  }
                  className="w-full bg-[var(--input)] border border-[var(--border)] rounded-2xl px-5 py-4 outline-none focus:border-blue-500 transition"
                />

              </div>

              {/* EMAIL */}
              <div className="md:col-span-2">

                <label className="block mb-2 font-medium">
                  Email Address
                </label>

                <input
                  title="Email Address"
                  type="email"
                  value={email}
                  readOnly
                  className="w-full bg-[var(--input)] border border-[var(--border)] rounded-2xl px-5 py-4 opacity-70"
                />

              </div>

            </div>

          </div>

          {/* NOTIFICATIONS */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-5 md:p-8 shadow-xl">

            <h2 className="text-2xl font-bold mb-8">
              Notifications
            </h2>

            <div className="space-y-5">

              {/* EMAIL NOTIFICATION */}
              <div className="bg-[var(--input)] border border-[var(--border)] rounded-2xl p-5 flex items-center justify-between">

                <div>

                  <h3 className="font-semibold text-lg">
                    Email Notifications
                  </h3>

                  <p className="text-gray-400 text-sm mt-1">
                    Receive account activity alerts
                  </p>

                </div>

                <button
                  title="Toggle Email Notifications"
                  onClick={() =>
                    setEmailNotifications(
                      !emailNotifications
                    )
                  }
                  className={`w-16 h-9 rounded-full transition relative ${
                    emailNotifications
                      ? "bg-green-500"
                      : "bg-gray-600"
                  }`}
                >

                  <div
                    className={`absolute top-1 w-7 h-7 bg-white rounded-full transition ${
                      emailNotifications
                        ? "translate-x-8"
                        : "translate-x-1"
                    }`}
                  />

                </button>

              </div>

              {/* SMS NOTIFICATION */}
              <div className="bg-[var(--input)] border border-[var(--border)] rounded-2xl p-5 flex items-center justify-between">

                <div>

                  <h3 className="font-semibold text-lg">
                    SMS Notifications
                  </h3>

                  <p className="text-gray-400 text-sm mt-1">
                    Receive SMS alerts instantly
                  </p>

                </div>

                <button
                  title="Toggle SMS Notifications"
                  onClick={() =>
                    setSmsNotifications(
                      !smsNotifications
                    )
                  }
                  className={`w-16 h-9 rounded-full transition relative ${
                    smsNotifications
                      ? "bg-green-500"
                      : "bg-gray-600"
                  }`}
                >

                  <div
                    className={`absolute top-1 w-7 h-7 bg-white rounded-full transition ${
                      smsNotifications
                        ? "translate-x-8"
                        : "translate-x-1"
                    }`}
                  />

                </button>

              </div>

            </div>

          </div>

          {/* APPEARANCE */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-5 md:p-8 shadow-xl">

            <h2 className="text-2xl font-bold mb-8">
              Appearance
            </h2>

            <div className="bg-[var(--input)] border border-[var(--border)] rounded-2xl p-5 flex items-center justify-between">

              <div>

                <h3 className="font-semibold text-lg">
                  Dark Mode
                </h3>

                <p className="text-gray-400 text-sm mt-1">
                  Switch between light and dark themes
                </p>

              </div>

              <button
                title="Toggle Dark Mode"
                onClick={handleThemeToggle}
                className={`w-16 h-9 rounded-full transition relative ${
                  darkMode
                    ? "bg-blue-600"
                    : "bg-gray-600"
                }`}
              >

                <div
                  className={`absolute top-1 w-7 h-7 bg-white rounded-full transition ${
                    darkMode
                      ? "translate-x-8"
                      : "translate-x-1"
                  }`}
                />

              </button>

            </div>

          </div>

          {/* SECURITY */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-5 md:p-8 shadow-xl">

            <h2 className="text-2xl font-bold mb-8">
              Security
            </h2>

            <div className="space-y-5">

              <div className="bg-[var(--input)] border border-[var(--border)] rounded-2xl p-5">

                <p className="font-semibold">
                  Account Status
                </p>

                <p className="text-green-400 mt-2">
                  Verified & Active
                </p>

              </div>

              <Link href="/forgot-password">

                <button
                  title="Change Password"
                  className="w-full bg-yellow-600 hover:bg-yellow-700 py-4 rounded-2xl font-semibold transition"
                >
                  Change Password
                </button>

              </Link>

              <button
                title="Logout"
                onClick={handleLogout}
                className="w-full bg-red-600 hover:bg-red-700 py-4 rounded-2xl font-semibold transition"
              >
                Logout
              </button>

            </div>

          </div>

          {/* SAVE BUTTON */}
          <button
            title="Save Settings"
            onClick={handleSave}
            className="w-full bg-blue-600 hover:bg-blue-700 py-5 rounded-2xl text-lg font-bold transition shadow-xl"
          >
            Save Changes
          </button>

          {/* DANGER ZONE */}
          <div className="bg-red-950 border border-red-700 rounded-3xl p-5 md:p-8 shadow-xl">

            <h2 className="text-3xl font-bold text-red-400 mb-4">
              Danger Zone
            </h2>

            <p className="text-gray-300 mb-6 leading-8">

              Deleting your account is permanent and cannot be undone.

            </p>

            <button
              title="Delete Account"
              onClick={handleDeleteAccount}
              className="bg-red-600 hover:bg-red-700 px-8 py-4 rounded-2xl font-semibold transition"
            >
              Delete Account
            </button>

          </div>

        </div>

      </div>

      <MobileNav />

    </main>
  );
}