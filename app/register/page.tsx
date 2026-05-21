"use client";

import Link from "next/link";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function RegisterPage() {

  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [showPassword, setShowPassword] =
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

    setLoading(true);

    const { data, error } =
      await supabase.auth.signUp({

        email,

        password,

        options: {

          emailRedirectTo:
            "http://localhost:3000/login",

          data: {

            full_name: fullName,

            username: username,
          },
        },
      });

    if (error) {

      setLoading(false);

      alert(error.message);

      return;
    }

    const user = data.user;

    if (user) {

      /* CREATE PROFILE */
      await supabase
        .from("profiles")
        .insert([
          {
            id: user.id,
            full_name: fullName,
            username,
            email,
          },
        ]);

      /* CREATE WALLET */
      await supabase
        .from("wallets")
        .insert([
          {
            user_id: user.id,
            balance: 0,
          },
        ]);
    }

    setLoading(false);

    alert(
      "Registration successful! Verification email sent."
    );

    router.push("/login");
  }

  return (

    <main className="auth-background min-h-screen relative flex items-center justify-center px-6 py-10">

      {/* DARK OVERLAY */}
      <div className="absolute inset-0 bg-black/75" />

      {/* REGISTER CARD */}
      <div className="relative z-10 w-full max-w-lg">

        <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl p-10 shadow-2xl">

          {/* HEADER */}
          <div className="text-center mb-10">

            <h1 className="text-4xl font-bold text-white">
              Create Account
            </h1>

            <p className="text-gray-300 mt-3">
              Join Danmus SMS today
            </p>

          </div>

          {/* FORM */}
          <form
            onSubmit={handleRegister}
            className="space-y-6"
          >

            {/* FULL NAME */}
            <div>

              <label className="block text-white mb-2">
                Full Name
              </label>

              <input
                title="Full Name"
                type="text"
                placeholder="Enter your full name"
                value={fullName}
                onChange={(e) =>
                  setFullName(e.target.value)
                }
                className="w-full bg-white/10 border border-white/20 rounded-2xl px-5 py-4 text-white placeholder-gray-300 outline-none focus:border-blue-500 transition"
                required
              />

            </div>

            {/* USERNAME */}
            <div>

              <label className="block text-white mb-2">
                Username
              </label>

              <input
                title="Username"
                type="text"
                placeholder="Choose a username"
                value={username}
                onChange={(e) =>
                  setUsername(e.target.value)
                }
                className="w-full bg-white/10 border border-white/20 rounded-2xl px-5 py-4 text-white placeholder-gray-300 outline-none focus:border-blue-500 transition"
                required
              />

            </div>

            {/* EMAIL */}
            <div>

              <label className="block text-white mb-2">
                Email Address
              </label>

              <input
                title="Email Address"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                className="w-full bg-white/10 border border-white/20 rounded-2xl px-5 py-4 text-white placeholder-gray-300 outline-none focus:border-blue-500 transition"
                required
              />

            </div>

            {/* PASSWORD */}
            <div>

              <label className="block text-white mb-2">
                Password
              </label>

              <div className="relative">

                <input
                  title="Password"
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
                  className="w-full bg-white/10 border border-white/20 rounded-2xl px-5 py-4 text-white placeholder-gray-300 outline-none focus:border-blue-500 transition"
                  required
                />

                <button
                  title="Toggle Password"
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      !showPassword
                    )
                  }
                  className="absolute right-4 top-4 text-sm text-gray-300"
                >
                  {showPassword
                    ? "Hide"
                    : "Show"}
                </button>

              </div>

            </div>

            {/* CONFIRM PASSWORD */}
            <div>

              <label className="block text-white mb-2">
                Confirm Password
              </label>

              <div className="relative">

                <input
                  title="Confirm Password"
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
                  className="w-full bg-white/10 border border-white/20 rounded-2xl px-5 py-4 text-white placeholder-gray-300 outline-none focus:border-blue-500 transition"
                  required
                />

                <button
                  title="Toggle Confirm Password"
                  type="button"
                  onClick={() =>
                    setShowConfirmPassword(
                      !showConfirmPassword
                    )
                  }
                  className="absolute right-4 top-4 text-sm text-gray-300"
                >
                  {showConfirmPassword
                    ? "Hide"
                    : "Show"}
                </button>

              </div>

            </div>

            {/* REGISTER BUTTON */}
            <button
              title="Register"
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 py-4 rounded-2xl font-bold text-white transition shadow-xl"
            >

              {loading
                ? "Creating Account..."
                : "Create Account"}

            </button>

          </form>

          {/* LOGIN LINK */}
          <p className="text-center text-gray-300 mt-8">

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