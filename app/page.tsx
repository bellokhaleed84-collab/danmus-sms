"use client";

import Link from "next/link";
import GoogleLoginButton from "../components/GoogleLoginButton";

export default function HomePage() {

  return (

    <main className="bg-[var(--background)] text-[var(--foreground)] transition-all duration-300">

      {/* NAVBAR */}

      <header className="fixed top-0 left-0 w-full z-50 bg-black/40 backdrop-blur-xl border-b border-white/10">

        <div className="max-w-7xl mx-auto px-4 md:px-4 md:px-6 py-3 md:py-4 md:py-5 flex items-center justify-between">

          <h1 className="text-xl md:text-2xl font-bold text-blue-500">
            Danmus SMS
          </h1>

          <nav className="hidden md:flex items-center gap-5 md:p-8">

            <a
              href="#features"
              className="hover:text-blue-500 transition"
            >
              Features
            </a>

            <a
              href="#services"
              className="hover:text-blue-500 transition"
            >
              Services
            </a>

            <a
              href="#about"
              className="hover:text-blue-500 transition"
            >
              About
            </a>

          </nav>

          <div className="flex items-center gap-2 md:gap-4">

            <Link href="/login">

              <button
                title="Login"
                className="px-4 md:px-5 py-2 rounded-xl border border-white/20 hover:bg-white/10 transition text-sm md:text-base"
              >
                Login
              </button>

            </Link>

            <Link href="/register">

              <button
                title="Get Started"
                className="bg-blue-600 hover:bg-blue-700 px-4 md:px-5 py-2 rounded-xl font-semibold transition text-sm md:text-base"
              >
                Get Started
              </button>

            </Link>

          </div>

        </div>

      </header>

      {/* HERO SECTION */}

      <section
        className="min-h-screen bg-cover bg-center relative flex items-center justify-center px-4 md:px-6 pt-36 md:pt-20"
        style={{
          backgroundImage: "url('/bg.jpg')",
        }}
      >

        {/* Overlay */}

        <div className="absolute inset-0 bg-black/70" />

        {/* Content */}

        <div className="relative z-10 max-w-6xl mx-auto grid md:grid-cols-2 gap-10 items-center py-6 md:py-10">

          <div>

            <p className="text-blue-400 font-semibold mb-5 text-sm md:text-base">
              FAST • SECURE • RELIABLE
            </p>

            <h1 className="text-2xl md:text-4xl sm:text-2xl md:text-3xl md:text-5xl md:text-7xl font-bold leading-tight text-white">

              Buy Virtual Numbers Instantly

            </h1>

            <p className="text-gray-300 text-base md:text-lg mt-8 leading-8">

              Danmus SMS helps you receive OTP verification codes
              for WhatsApp, Telegram, Google, Facebook,
              TikTok and many more services worldwide.

            </p>

            <div className="flex flex-col sm:flex-row gap-5 mt-10">

              <Link href="/register">

                <button
                  title="Create Account"
                  className="bg-blue-600 hover:bg-blue-700 px-5 md:px-8 py-3 md:py-4 rounded-2xl font-semibold transition shadow-2xl w-full sm:w-auto"
                >
                  Create Account
                </button>

              </Link>

              <Link href="/login">

                <button
                  title="Login"
                  className="bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/20 px-5 md:px-8 py-3 md:py-4 rounded-2xl font-semibold transition w-full sm:w-auto"
                >
                  Login
                </button>

              </Link>
              <div className="mt-2">
  <GoogleLoginButton />
</div>

            </div>

          </div>

          {/* Right Card */}

          <div className="bg-white/10 backdrop-blur-2xl border border-white/10 rounded-2xl md:rounded-3xl p-6 md:p-5 md:p-8 shadow-2xl">

            <h2 className="text-2xl md:text-2xl md:text-3xl font-bold text-white mb-8">
              Platform Statistics
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

              <div className="bg-black/30 rounded-2xl p-6">

                <p className="text-gray-400">
                  Active Users
                </p>

                <h3 className="text-2xl md:text-3xl font-bold mt-3 text-blue-400">
                  12K+
                </h3>

              </div>

              <div className="bg-black/30 rounded-2xl p-6">

                <p className="text-gray-400">
                  OTP Delivered
                </p>

                <h3 className="text-2xl md:text-3xl font-bold mt-3 text-green-400">
                  1.2M+
                </h3>

              </div>

              <div className="bg-black/30 rounded-2xl p-6">

                <p className="text-gray-400">
                  Countries
                </p>

                <h3 className="text-2xl md:text-3xl font-bold mt-3 text-yellow-400">
                  90+
                </h3>

              </div>

              <div className="bg-black/30 rounded-2xl p-6">

                <p className="text-gray-400">
                  Services
                </p>

                <h3 className="text-2xl md:text-3xl font-bold mt-3 text-pink-400">
                  250+
                </h3>

              </div>

            </div>

          </div>

        </div>

      </section>

      {/* FEATURES */}

      <section
        id="features"
        className="py-20 md:py-28 px-4 md:px-6"
      >

        <div className="max-w-7xl mx-auto">

          <div className="text-center mb-16">

            <h2 className="text-2xl md:text-3xl md:text-2xl md:text-3xl md:text-5xl font-bold">
              Powerful Features
            </h2>

            <p className="text-gray-400 mt-5 text-base md:text-lg">
              Everything you need for OTP verification
            </p>

          </div>

          <div className="grid md:grid-cols-3 gap-5 md:p-8">

            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl md:rounded-3xl p-5 md:p-8 hover:scale-105 transition">

              <div className="text-2xl md:text-3xl md:text-5xl mb-6">
                ⚡
              </div>

              <h3 className="text-2xl font-bold mb-4">
                Instant OTP
              </h3>

              <p className="text-gray-400 leading-8">
                Receive verification codes within seconds
                with our ultra-fast system.
              </p>

            </div>

            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl md:rounded-3xl p-5 md:p-8 hover:scale-105 transition">

              <div className="text-2xl md:text-3xl md:text-5xl mb-6">
                🌍
              </div>

              <h3 className="text-2xl font-bold mb-4">
                Global Numbers
              </h3>

              <p className="text-gray-400 leading-8">
                Access numbers from multiple countries
                worldwide instantly.
              </p>

            </div>

            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl md:rounded-3xl p-5 md:p-8 hover:scale-105 transition">

              <div className="text-2xl md:text-3xl md:text-5xl mb-6">
                🔒
              </div>

              <h3 className="text-2xl font-bold mb-4">
                Secure Platform
              </h3>

              <p className="text-gray-400 leading-8">
                Your transactions and OTP activities
                remain fully protected.
              </p>

            </div>

          </div>

        </div>

      </section>

      {/* SERVICES */}

      <section
        id="services"
        className="py-20 md:py-28 px-4 md:px-6 bg-black/10"
      >

        <div className="max-w-7xl mx-auto">

          <div className="text-center mb-16">

            <h2 className="text-2xl md:text-3xl md:text-2xl md:text-3xl md:text-5xl font-bold">
              Supported Services
            </h2>

            <p className="text-gray-400 mt-5 text-base md:text-lg">
              Use Danmus SMS with your favorite apps
            </p>

          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">

            {[
              "WhatsApp",
              "Telegram",
              "Google",
              "Facebook",
              "TikTok",
              "Instagram",
              "Discord",
              "Twitter",
            ].map((service, index) => (

              <div
                key={index}
                className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 md:p-5 md:p-8 text-center hover:border-blue-500 transition"
              >

                <h3 className="text-lg md:text-2xl font-semibold">
                  {service}
                </h3>

              </div>

            ))}

          </div>

        </div>

      </section>

      {/* ABOUT */}

      <section
        id="about"
        className="py-20 md:py-28 px-4 md:px-6"
      >

        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-14 items-center">

          <div>

            <h2 className="text-2xl md:text-3xl md:text-2xl md:text-3xl md:text-5xl font-bold leading-tight">

              Why Choose Danmus SMS?

            </h2>

            <p className="text-gray-400 text-base md:text-lg leading-9 mt-8">

              We provide reliable virtual numbers for secure OTP
              verification worldwide. Our system is built for speed,
              stability and affordability.

            </p>

            <p className="text-gray-400 text-base md:text-lg leading-9 mt-6">

              Whether you need verification for WhatsApp,
              Telegram, Google or social media accounts,
              Danmus SMS delivers instantly.

            </p>

            <Link href="/register">

              <button
                title="Start Now"
                className="bg-blue-600 hover:bg-blue-700 mt-10 px-5 md:px-8 py-3 md:py-4 rounded-2xl font-semibold transition w-full sm:w-auto"
              >
                Start Now
              </button>

            </Link>

          </div>

          <div className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10 rounded-2xl md:rounded-3xl p-6 md:p-10 backdrop-blur-2xl">

            <div className="space-y-6">

              <div className="bg-black/20 rounded-2xl p-6">

                <h3 className="text-xl md:text-2xl font-bold">
                  ⚡ Fast Delivery
                </h3>

                <p className="text-gray-400 mt-3">
                  OTP codes delivered instantly.
                </p>

              </div>

              <div className="bg-black/20 rounded-2xl p-6">

                <h3 className="text-xl md:text-2xl font-bold">
                  💳 Affordable Pricing
                </h3>

                <p className="text-gray-400 mt-3">
                  Low prices in ₦ Naira currency.
                </p>

              </div>

              <div className="bg-black/20 rounded-2xl p-6">

                <h3 className="text-xl md:text-2xl font-bold">
                  🌍 Worldwide Access
                </h3>

                <p className="text-gray-400 mt-3">
                  Multiple countries and services supported.
                </p>

              </div>

            </div>

          </div>

        </div>

      </section>

      {/* CTA */}

      <section className="py-20 md:py-28 px-4 md:px-6">

        <div className="max-w-5xl mx-auto bg-gradient-to-r from-blue-600 to-purple-600 rounded-[40px] p-5 md:p-8 md:p-14 text-center shadow-2xl">

          <h2 className="text-2xl md:text-3xl md:text-2xl md:text-3xl md:text-5xl font-bold text-white">

            Ready To Start?

          </h2>

          <p className="text-white/80 text-base md:text-lg mt-6">

            Create your Danmus SMS account today and
            start receiving OTP codes instantly.

          </p>

          <Link href="/register">

            <button
              title="Create Free Account"
              className="bg-white text-black hover:bg-gray-200 mt-10 px-10 py-3 md:py-4 rounded-2xl font-bold transition w-full sm:w-auto"
            >
              Create Free Account
            </button>

          </Link>

        </div>

      </section>

      {/* FOOTER */}

      <footer className="border-t border-white/10 py-6 md:py-10 px-4 md:px-6">

        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-5">

          <h2 className="text-2xl font-bold text-blue-500">
            Danmus SMS
          </h2>

          <p className="text-gray-400 text-center">
            © 2026 Danmus SMS. All rights reserved.
          </p>

        </div>

      </footer>

    </main>
  );
}