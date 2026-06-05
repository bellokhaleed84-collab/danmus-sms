"use client";

import Link from "next/link";
import { useState } from "react";
import API from "@/lib/api";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await API.post("/auth/login", {
        email,
        password,
      });

      const user = response.data.user;

      if (user.role !== "admin") {
        alert("Access denied. Admins only.");
        setLoading(false);
        return;
      }

      localStorage.setItem("token", response.data.token);
      localStorage.setItem("user", JSON.stringify(user));

      setLoading(false);
      router.push("/secure-admin-portal");

    } catch (error: any) {
      setLoading(false);
      alert(error.response?.data?.message || "Login failed");
    }
  }

  return (
    <main className="auth-background min-h-screen relative flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/75" />
      <div className="relative z-10 w-full max-w-lg">
        <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl p-10 shadow-2xl">

          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold text-white">Admin Login</h1>
            <p className="text-gray-300 mt-3">Danmus SMS Admin Portal</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-white mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-2xl px-5 py-4 text-white placeholder-gray-300 outline-none focus:border-blue-500"
                placeholder="Admin email"
                required
              />
            </div>

            <div>
              <label className="block text-white mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-2xl px-5 py-4 text-white placeholder-gray-300 outline-none focus:border-blue-500"
                placeholder="Admin password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 py-4 rounded-2xl font-bold text-white transition"
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>

          <p className="text-center text-gray-300 mt-8">
            <Link href="/login" className="text-blue-400 hover:text-blue-300">
              Back to user login
            </Link>
          </p>

        </div>
      </div>
    </main>
  );
}