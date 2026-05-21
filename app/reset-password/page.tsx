"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {

  const router = useRouter();

  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);

  async function handleUpdatePassword() {

    if (!password) {

      alert("Enter new password");

      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password,
    });

    setLoading(false);

    if (error) {

      alert(error.message);

      return;
    }

    alert("Password updated successfully");

    router.push("/login");
  }

  return (

    <main className="min-h-screen flex items-center justify-center bg-[var(--background)] text-[var(--foreground)] px-6">

      <div className="w-full max-w-md bg-[var(--card)] border border-[var(--border)] rounded-3xl p-8 shadow-2xl">

        <h1 className="text-4xl font-bold mb-3">
          Reset Password
        </h1>

        <p className="text-gray-400 mb-8">
          Enter your new password
        </p>

        <div className="space-y-5">

          <div>

            <label className="block mb-2">
              New Password
            </label>

            <input
              title="New Password"
              type="password"
              placeholder="Enter new password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[var(--input)] border border-[var(--border)] rounded-2xl px-5 py-4 outline-none focus:border-blue-500"
            />

          </div>

          <button
            title="Update Password"
            onClick={handleUpdatePassword}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 py-4 rounded-2xl font-bold transition"
          >
            {loading ? "Updating..." : "Update Password"}
          </button>

        </div>

      </div>

    </main>
  );
}