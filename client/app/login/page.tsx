"use client";

import Link from "next/link";
import { useState } from "react";
import API from "@/lib/api";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await API.post("/auth/login", {
        email,
        password,
      });

      localStorage.setItem("token", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data.user));

      setLoading(false);
      alert("Login successful!");
      router.push("/dashboard");

    } catch (error: any) {
      setLoading(false);
      alert(
        error.response?.data?.message || "Login failed"
      );
    }
  }

  return (
    <main className="auth-background min-h-screen relative flex items-center justify-center px-4 md:px-6 py-6 md:py-10">

      <div className="absolute inset-0 bg-black/75" />

      <div className="relative z-10 w-full max-w-lg">
        <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-2xl md:rounded-3xl p-10 shadow-2xl">

          <div className="text-center mb-10">
            <h1 className="text-2xl md:text-4xl font-bold text-white">
              Welcome Back
            </h1>
            <p className="text-gray-300 mt-3">
              Login to your Danmus SMS account
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">

            <div>
              <label className="block text-white mb-2">
                Email Address
              </label>
              <input
                title="Email Address"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-2xl px-5 py-3 md:py-4 text-white placeholder-gray-300 outline-none focus:border-blue-500 transition"
                required
              />
            </div>

            <div>
              <label className="block text-white mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  title="Password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-2xl px-5 py-3 md:py-4 text-white placeholder-gray-300 outline-none focus:border-blue-500 transition"
                  required
                />
                <button
                  title="Toggle Password"
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-4 text-sm text-gray-300"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div className="text-right">
              <Link href="/forgot-password" className="text-blue-400 hover:text-blue-300 text-sm">
                Forgot Password?
              </Link>
            </div>

            <button
              title="Login"
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 py-3 md:py-4 rounded-2xl font-bold text-white transition shadow-xl"
            >
              {loading ? "Logging in..." : "Login"}
            </button>
            

          </form>

          <p className="text-center text-gray-300 mt-8">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-blue-400 hover:text-blue-300 font-semibold">
              Register
            </Link>
          </p>

        </div>
      </div>
    </main>
  );
}