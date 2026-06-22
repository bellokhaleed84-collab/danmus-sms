"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import GoogleAuthButton from "@/components/GoogleAuthButton";
import Footer from "@/components/Footer";

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
} as const;

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15 } },
} as const;

export default function HomePage() {

  return (

    <main className="bg-[var(--background)] text-[var(--foreground)] transition-all duration-300">

      {/* NAVBAR */}

      <header className="fixed top-0 left-0 w-full z-50 bg-black/40 backdrop-blur-xl border-b border-white/10">

        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 md:py-5 flex items-center justify-between">

          <h1 className="text-xl md:text-2xl font-bold text-blue-500">
            Danmus SMS
          </h1>

          <nav className="hidden md:flex items-center gap-5">

            <a href="#features" className="hover:text-blue-500 transition">
              Features
            </a>

            <a href="#services" className="hover:text-blue-500 transition">
              Services
            </a>

            <a href="#about" className="hover:text-blue-500 transition">
              About
            </a>

          </nav>

          <div className="flex items-center gap-2 md:gap-4">

            <Link href="/login">
              <button title="Login" className="px-4 md:px-5 py-2 rounded-xl border border-white/20 hover:bg-white/10 transition text-sm md:text-base">
                Login
              </button>
            </Link>

            <Link href="/register">
              <button title="Get Started" className="bg-blue-600 hover:bg-blue-700 px-4 md:px-5 py-2 rounded-xl font-semibold transition text-sm md:text-base">
                Get Started
              </button>
            </Link>

          </div>

        </div>

      </header>

      {/* HERO SECTION */}

      <section
        className="min-h-screen bg-cover bg-center relative flex items-center justify-center px-4 md:px-6 pt-36 md:pt-20"
        style={{ backgroundImage: "url('/bg.jpg')" }}
      >

        <div className="absolute inset-0 bg-black/70" />

        <div className="relative z-10 max-w-6xl mx-auto grid md:grid-cols-2 gap-10 items-center py-6 md:py-10">

          <motion.div initial="hidden" animate="visible" variants={stagger}>

            <motion.p variants={fadeUp} className="text-blue-400 font-semibold mb-5 text-sm md:text-base">
              FAST • SECURE • RELIABLE
            </motion.p>

            <motion.h1 variants={fadeUp} className="text-2xl sm:text-4xl md:text-7xl font-bold leading-tight text-white">
              Buy Virtual Numbers Instantly
            </motion.h1>

            <motion.p variants={fadeUp} className="text-gray-300 text-base md:text-lg mt-8 leading-8">
              Danmus SMS helps you receive OTP verification codes
              for WhatsApp, Telegram, Google, Facebook,
              TikTok and many more services worldwide.
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-5 mt-10">

              <Link href="/register">
                <button title="Create Account" className="bg-blue-600 hover:bg-blue-700 px-5 md:px-8 py-3 md:py-4 rounded-2xl font-semibold transition shadow-2xl w-full sm:w-auto">
                  Create Account
                </button>
              </Link>

              <Link href="/login">
                <button title="Login" className="bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/20 px-5 md:px-8 py-3 md:py-4 rounded-2xl font-semibold transition w-full sm:w-auto">
                  Login
                </button>
              </Link>

              <div className="mt-2">
                <GoogleAuthButton />
              </div>

            </motion.div>

          </motion.div>

          {/* Right Card */}

          <motion.div
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
            className="bg-white/10 backdrop-blur-2xl border border-white/10 rounded-2xl md:rounded-3xl p-6 md:p-8 shadow-2xl"
          >

            <h2 className="text-2xl md:text-3xl font-bold text-white mb-8">
              Platform Statistics
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

              <div className="bg-black/30 rounded-2xl p-6">
                <p className="text-gray-400">Active Users</p>
                <h3 className="text-2xl md:text-3xl font-bold mt-3 text-blue-400">12K+</h3>
              </div>

              <div className="bg-black/30 rounded-2xl p-6">
                <p className="text-gray-400">OTP Delivered</p>
                <h3 className="text-2xl md:text-3xl font-bold mt-3 text-green-400">1.2M+</h3>
              </div>

              <div className="bg-black/30 rounded-2xl p-6">
                <p className="text-gray-400">Countries</p>
                <h3 className="text-2xl md:text-3xl font-bold mt-3 text-yellow-400">90+</h3>
              </div>

              <div className="bg-black/30 rounded-2xl p-6">
                <p className="text-gray-400">Services</p>
                <h3 className="text-2xl md:text-3xl font-bold mt-3 text-pink-400">250+</h3>
              </div>

            </div>

          </motion.div>

        </div>

      </section>

      {/* FEATURES */}

      <section id="features" className="py-20 md:py-28 px-4 md:px-6">

        <div className="max-w-7xl mx-auto">

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={stagger}
            className="text-center mb-16"
          >

            <motion.h2 variants={fadeUp} className="text-2xl md:text-5xl font-bold">
              Powerful Features
            </motion.h2>

            <motion.p variants={fadeUp} className="text-gray-400 mt-5 text-base md:text-lg">
              Everything you need for OTP verification
            </motion.p>

          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={stagger}
            className="grid md:grid-cols-3 gap-5 md:p-8"
          >

            <motion.div variants={fadeUp} className="bg-[var(--card)] border border-[var(--border)] rounded-2xl md:rounded-3xl p-5 md:p-8 hover:scale-105 transition">
              <div className="text-5xl mb-6">⚡</div>
              <h3 className="text-2xl font-bold mb-4">Instant OTP</h3>
              <p className="text-gray-400 leading-8">Receive verification codes within seconds with our ultra-fast system.</p>
            </motion.div>

            <motion.div variants={fadeUp} className="bg-[var(--card)] border border-[var(--border)] rounded-2xl md:rounded-3xl p-5 md:p-8 hover:scale-105 transition">
              <div className="text-5xl mb-6">🌍</div>
              <h3 className="text-2xl font-bold mb-4">Global Numbers</h3>
              <p className="text-gray-400 leading-8">Access numbers from multiple countries worldwide instantly.</p>
            </motion.div>

            <motion.div variants={fadeUp} className="bg-[var(--card)] border border-[var(--border)] rounded-2xl md:rounded-3xl p-5 md:p-8 hover:scale-105 transition">
              <div className="text-5xl mb-6">🔒</div>
              <h3 className="text-2xl font-bold mb-4">Secure Platform</h3>
              <p className="text-gray-400 leading-8">Your transactions and OTP activities remain fully protected.</p>
            </motion.div>

          </motion.div>

        </div>

      </section>

      {/* SERVICES */}

      <section id="services" className="py-20 md:py-28 px-4 md:px-6 bg-black/10">

        <div className="max-w-7xl mx-auto">

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={stagger}
            className="text-center mb-16"
          >

            <motion.h2 variants={fadeUp} className="text-2xl md:text-5xl font-bold">
              Supported Services
            </motion.h2>

            <motion.p variants={fadeUp} className="text-gray-400 mt-5 text-base md:text-lg">
              Use Danmus SMS with your favorite apps
            </motion.p>

          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={stagger}
            className="grid grid-cols-2 md:grid-cols-3 gap-6"
          >

            <motion.a
              variants={fadeUp}
              href="https://whatsapp.com/channel/0029Vb8N0VeAojYsaAlNz83R"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 md:p-8 text-center hover:border-green-500 hover:scale-105 transition flex flex-col items-center gap-4"
            >
              <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" alt="WhatsApp" className="w-14 h-14" />
              <h3 className="text-lg md:text-xl font-semibold">WhatsApp</h3>
            </motion.a>

            <motion.a
              variants={fadeUp}
              href="https://t.me/Danmus_Sms"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 md:p-8 text-center hover:border-sky-500 hover:scale-105 transition flex flex-col items-center gap-4"
            >
              <img src="https://upload.wikimedia.org/wikipedia/commons/8/82/Telegram_logo.svg" alt="Telegram" className="w-14 h-14" />
              <h3 className="text-lg md:text-xl font-semibold">Telegram</h3>
            </motion.a>

            <motion.a
              variants={fadeUp}
              href="https://www.tiktok.com/@danmus_sms?_r=1&_t=ZS-97Mp9Jqxihp"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 md:p-8 text-center hover:border-black hover:scale-105 transition flex flex-col items-center gap-4"
            >
              <img src="https://upload.wikimedia.org/wikipedia/en/a/a9/TikTok_logo.svg" alt="TikTok" className="w-14 h-14" />
              <h3 className="text-lg md:text-xl font-semibold">TikTok</h3>
            </motion.a>

            <motion.a
              variants={fadeUp}
              href="https://www.instagram.com/danmus_sms?igsh=MnRsaHVjbHBsMDJ6&utm_source=qr"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 md:p-8 text-center hover:border-pink-500 hover:scale-105 transition flex flex-col items-center gap-4"
            >
              <img src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Instagram_icon.png" alt="Instagram" className="w-14 h-14" />
              <h3 className="text-lg md:text-xl font-semibold">Instagram</h3>
            </motion.a>

            <motion.a
              variants={fadeUp}
              href="https://x.com/danmus_sms?s=11"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 md:p-8 text-center hover:border-black hover:scale-105 transition flex flex-col items-center gap-4"
            >
              <img src="https://upload.wikimedia.org/wikipedia/commons/5/57/X_logo_2023_%28white%29.png" alt="X" className="w-14 h-14 rounded-xl bg-black p-1" />
              <h3 className="text-lg md:text-xl font-semibold">Twitter / X</h3>
            </motion.a>

          </motion.div>

        </div>

      </section>

      {/* ABOUT */}

      <section id="about" className="py-20 md:py-28 px-4 md:px-6">

        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-14 items-center">

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={stagger}
          >

            <motion.h2 variants={fadeUp} className="text-2xl md:text-5xl font-bold leading-tight">
              Why Choose Danmus SMS?
            </motion.h2>

            <motion.p variants={fadeUp} className="text-gray-400 text-base md:text-lg leading-9 mt-8">
              We provide reliable virtual numbers for secure OTP
              verification worldwide. Our system is built for speed,
              stability and affordability.
            </motion.p>

            <motion.p variants={fadeUp} className="text-gray-400 text-base md:text-lg leading-9 mt-6">
              Whether you need verification for WhatsApp,
              Telegram, Google or social media accounts,
              Danmus SMS delivers instantly.
            </motion.p>

            <motion.div variants={fadeUp}>
              <Link href="/register">
                <button title="Start Now" className="bg-blue-600 hover:bg-blue-700 mt-10 px-5 md:px-8 py-3 md:py-4 rounded-2xl font-semibold transition w-full sm:w-auto">
                  Start Now
                </button>
              </Link>
            </motion.div>

          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 60 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10 rounded-2xl md:rounded-3xl p-6 md:p-10 backdrop-blur-2xl"
          >

            <div className="space-y-6">

              <div className="bg-black/20 rounded-2xl p-6">
                <h3 className="text-xl md:text-2xl font-bold">⚡ Fast Delivery</h3>
                <p className="text-gray-400 mt-3">OTP codes delivered instantly.</p>
              </div>

              <div className="bg-black/20 rounded-2xl p-6">
                <h3 className="text-xl md:text-2xl font-bold">💳 Affordable Pricing</h3>
                <p className="text-gray-400 mt-3">Low prices in ₦ Naira currency.</p>
              </div>

              <div className="bg-black/20 rounded-2xl p-6">
                <h3 className="text-xl md:text-2xl font-bold">🌍 Worldwide Access</h3>
                <p className="text-gray-400 mt-3">Multiple countries and services supported.</p>
              </div>

            </div>

          </motion.div>

        </div>

      </section>

      {/* CTA */}

      <section className="py-20 md:py-28 px-4 md:px-6">

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="max-w-5xl mx-auto bg-gradient-to-r from-blue-600 to-purple-600 rounded-[40px] p-8 md:p-14 text-center shadow-2xl"
        >

          <h2 className="text-2xl md:text-5xl font-bold text-white">
            Ready To Start?
          </h2>

          <p className="text-white/80 text-base md:text-lg mt-6">
            Create your Danmus SMS account today and
            start receiving OTP codes instantly.
          </p>

          <Link href="/register">
            <button title="Create Free Account" className="bg-white text-black hover:bg-gray-200 mt-10 px-10 py-3 md:py-4 rounded-2xl font-bold transition w-full sm:w-auto">
              Create Free Account
            </button>
          </Link>

        </motion.div>

      </section>

      {/* FOOTER */}

      <Footer />

    </main>
  );
}               