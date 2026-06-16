"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import API from "@/lib/api";

export default function ResetPasswordPage() {

  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState("");

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const t = urlParams.get("token");
    if (!t) {
      alert("Invalid reset link");
      router.push("/forgot-password");
      return;
    }
    setToken(t);
  }, [router]);

  async function handleUpdatePassword() {

    if (!password) {
      alert("Enter new password");
      return;
    }

    if (password.length < 6) {
      alert("Password must be at least 6 characters");
      return;
    }

    if (password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    setLoading(true);

    try {

      await API.post("/auth/reset-password", { token, password });

      alert("Password reset successfully!");

      router.push("/login");

    } catch (error: any) {

      alert(
        error.response?.data?.message || "Failed to reset password"
      );

    } finally {

      setLoading(false);
    }
  }

  return (

    <main className="min-h-screen flex items-center justify-center bg-[var(--background)] text-[var(--foreground)] px-4 md:px-6">

      <div className="w-full max-w-md bg-[var(--card)] border border-[var(--border)] rounded-2xl md:rounded-3xl p-5 md:p-8 shadow-2xl">

        <h1 className="text-2xl md:text-4xl font-bold mb-3">
          Reset Password
        </h1>

        <p className="text-gray-400 mb-8">
          Enter your new password below
        </p>

        <div className="space-y-5">

          <div>
            <label className="block mb-2">New Password</label>
            <input
              title="New Password"
              type="password"
              placeholder="Enter new password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[var(--input)] border border-[var(--border)] rounded-2xl px-5 py-3 md:py-4 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block mb-2">Confirm Password</label>
            <input
              title="Confirm Password"
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-[var(--input)] border border-[var(--border)] rounded-2xl px-5 py-3 md:py-4 outline-none focus:border-blue-500"
            />
          </div>

          <button
            title="Update Password"
            onClick={handleUpdatePassword}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 py-3 md:py-4 rounded-2xl font-bold transition"
          >
            {loading ? "Updating..." : "Update Password"}
          </button>

        </div>

        <Link
          href="/login"
          className="block text-center text-blue-500 mt-5"
        >
          Back to Login
        </Link>

      </div>

    </main>
  );
}