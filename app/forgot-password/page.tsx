"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function ForgotPasswordPage() {

  const [email, setEmail] = useState("");

  const [loading, setLoading] = useState(false);

  async function handleResetPassword() {

    if (!email) {

      alert("Enter your email");

      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "http://localhost:3000/reset-password",
    });

    setLoading(false);

    if (error) {

      alert(error.message);

      return;
    }

    alert("Password reset email sent successfully");
  }

  return (

    <main className="min-h-screen flex items-center justify-center bg-[var(--background)] text-[var(--foreground)] px-6">

      <div className="w-full max-w-md bg-[var(--card)] border border-[var(--border)] rounded-3xl p-8 shadow-2xl">

        <h1 className="text-4xl font-bold mb-3">
          Forgot Password
        </h1>

        <p className="text-gray-400 mb-8">
          Enter your email to reset password
        </p>

        <div className="space-y-5">

          <div>

            <label className="block mb-2">
              Email Address
            </label>

            <input
              title="Email Address"
              type="email"
              placeholder="Enter email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[var(--input)] border border-[var(--border)] rounded-2xl px-5 py-4 outline-none focus:border-blue-500"
            />

          </div>

          <button
            title="Reset Password"
            onClick={handleResetPassword}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 py-4 rounded-2xl font-bold transition"
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </button>

          <Link
            href="/login"
            className="block text-center text-blue-500 mt-5"
          >
            Back to Login
          </Link>

        </div>

      </div>

    </main>
  );
}