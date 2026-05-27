"use client";

import Link from "next/link";
import { useState } from "react";
import API from "@/lib/api";
import { useRouter } from "next/navigation";

export default function RegisterPage() {

  const router = useRouter();

  const [fullName, setFullName] = useState("");

  const [username, setUsername] = useState("");

  const [email, setEmail] = useState("");

  const [password, setPassword] =
    useState("");

  const [confirmPassword,
    setConfirmPassword] =
    useState("");

  const [showPassword,
    setShowPassword] =
    useState(false);

  const [showConfirmPassword,
    setShowConfirmPassword] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  async function handleRegister(
    e: React.FormEvent
  ) {

    e.preventDefault();

    if (password !== confirmPassword) {

      alert("Passwords do not match");

      return;
    }

    if (password.length < 6) {

      alert(
        "Password must be at least 6 characters"
      );

      return;
    }

    setLoading(true);

    try {

      const response =
        await API.post("/auth/register", {

          name: fullName,

          username,

          email,

          password,
        });

      localStorage.setItem(
        "token",
        response.data.token
      );

      localStorage.setItem(
        "user",
        JSON.stringify(response.data.user)
      );

      setLoading(false);

      alert(
        "Registration successful!"
      );

      router.push("/dashboard");

    } catch (error: any) {

      console.log(error);

      setLoading(false);

      alert(
        error.response?.data?.message ||
        "Registration failed"
      );
    }
  }

  return (

    <main className="auth-background min-h-screen relative flex items-center justify-center px-4 md:px-6 py-6 md:py-10 overflow-x-hidden">

      <div className="absolute inset-0 bg-black/75" />

      <div className="relative z-10 w-full max-w-lg">

        <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-2xl md:rounded-3xl p-5 sm:p-6 md:p-10 shadow-2xl">

          <div className="text-center mb-8 md:mb-10">

            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">
              Create Account
            </h1>

            <p className="text-gray-300 mt-3 text-sm sm:text-base">
              Join Danmus SMS today
            </p>

          </div>

          <form
            onSubmit={handleRegister}
            className="space-y-5 md:space-y-6"
          >

            <div>

              <label className="block text-white mb-2 text-sm sm:text-base">
                Full Name
              </label>

              <input
                type="text"
                placeholder="Enter your full name"
                value={fullName}
                onChange={(e) =>
                  setFullName(e.target.value)
                }
                className="w-full bg-white/10 border border-white/20 rounded-2xl px-4 md:px-5 py-3 md:py-4 text-white placeholder-gray-300 outline-none focus:border-blue-500"
                required
              />

            </div>

            <div>

              <label className="block text-white mb-2 text-sm sm:text-base">
                Username
              </label>

              <input
                type="text"
                placeholder="Choose a username"
                value={username}
                onChange={(e) =>
                  setUsername(e.target.value)
                }
                className="w-full bg-white/10 border border-white/20 rounded-2xl px-4 md:px-5 py-3 md:py-4 text-white placeholder-gray-300 outline-none focus:border-blue-500"
                required
              />

            </div>

            <div>

              <label className="block text-white mb-2 text-sm sm:text-base">
                Email Address
              </label>

              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                className="w-full bg-white/10 border border-white/20 rounded-2xl px-4 md:px-5 py-3 md:py-4 text-white placeholder-gray-300 outline-none focus:border-blue-500"
                required
              />

            </div>

            <div>

              <label className="block text-white mb-2 text-sm sm:text-base">
                Password
              </label>

              <div className="relative">

                <input
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  placeholder="Create password"
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  className="w-full bg-white/10 border border-white/20 rounded-2xl px-4 md:px-5 py-3 md:py-4 text-white placeholder-gray-300 outline-none focus:border-blue-500"
                  required
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      !showPassword
                    )
                  }
                  className="absolute right-4 top-3 md:top-4 text-sm text-gray-300"
                >
                  {showPassword
                    ? "Hide"
                    : "Show"}
                </button>

              </div>

            </div>

            <div>

              <label className="block text-white mb-2 text-sm sm:text-base">
                Confirm Password
              </label>

              <div className="relative">

                <input
                  type={
                    showConfirmPassword
                      ? "text"
                      : "password"
                  }
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(e) =>
                    setConfirmPassword(
                      e.target.value
                    )
                  }
                  className="w-full bg-white/10 border border-white/20 rounded-2xl px-4 md:px-5 py-3 md:py-4 text-white placeholder-gray-300 outline-none focus:border-blue-500"
                  required
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowConfirmPassword(
                      !showConfirmPassword
                    )
                  }
                  className="absolute right-4 top-3 md:top-4 text-sm text-gray-300"
                >
                  {showConfirmPassword
                    ? "Hide"
                    : "Show"}
                </button>

              </div>

            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 py-3 md:py-4 rounded-2xl font-bold text-white transition shadow-xl"
            >

              {loading
                ? "Creating Account..."
                : "Create Account"}

            </button>

          </form>

          <p className="text-center text-gray-300 mt-8 text-sm sm:text-base">

            Already have an account?{" "}

            <Link
              href="/login"
              className="text-blue-400 hover:text-blue-300 font-semibold"
            >
              Login
            </Link>

          </p>

        </div>

      </div>

    </main>
  );
}