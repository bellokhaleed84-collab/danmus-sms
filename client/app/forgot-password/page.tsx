"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleResetPassword() {
    if (!email) { alert("Enter your email"); return; }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSent(true);
    }, 1000);
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[var(--background)] text-[var(--foreground)] px-4 md:px-6">
      <div className="w-full max-w-md bg-[var(--card)] border border-[var(--border)] rounded-2xl md:rounded-3xl p-5 md:p-8 shadow-2xl">
        <h1 className="text-2xl md:text-4xl font-bold mb-3">Forgot Password</h1>
        <p className="text-gray-400 mb-8">Enter your email to reset password</p>
        {sent ? (
          <div className="bg-green-600 text-white p-5 rounded-2xl text-center">
            Reset link sent! Check your email.
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <label className="block mb-2">Email Address</label>
              <input
                title="Email Address"
                type="email"
                placeholder="Enter email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[var(--input)] border border-[var(--border)] rounded-2xl px-5 py-3 md:py-4 outline-none focus:border-blue-500"
              />
            </div>
            <button
              title="Reset Password"
              onClick={handleResetPassword}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 py-3 md:py-4 rounded-2xl font-bold transition"
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
          </div>
        )}
        <Link href="/login" className="block text-center text-blue-500 mt-5">
          Back to Login
        </Link>
      </div>
    </main>
  );
}