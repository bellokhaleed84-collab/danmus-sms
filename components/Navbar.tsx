"use client";

import Link from "next/link";
import { useState } from "react";

export default function Navbar() {

  const [menuOpen, setMenuOpen] =
    useState(false);

  return (

    <header className="fixed top-0 left-0 w-full z-50 bg-black/60 backdrop-blur-xl border-b border-white/10">

      <div className="max-w-7xl mx-auto px-4 sm:px-4 md:px-6 py-3 md:py-4 flex items-center justify-between">

        {/* LOGO */}
        <Link href="/">

          <h1 className="text-2xl md:text-2xl md:text-3xl font-bold text-blue-500">

            Danmus SMS

          </h1>

        </Link>

        {/* DESKTOP MENU */}
        <div className="hidden md:flex items-center gap-4">

          <Link href="/login">

            <button
              title="Login"
              className="border border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white px-4 md:px-6 py-3 rounded-2xl transition"
            >
              Login
            </button>

          </Link>

          <Link href="/register">

            <button
              title="Get Started"
              className="bg-blue-600 hover:bg-blue-700 px-4 md:px-6 py-3 rounded-2xl text-white font-semibold transition"
            >
              Get Started
            </button>

          </Link>

        </div>

        {/* MOBILE MENU BUTTON */}
        <button
          title="Toggle Menu"
          onClick={() =>
            setMenuOpen(!menuOpen)
          }
          className="md:hidden text-white text-2xl md:text-3xl"
        >
          ☰
        </button>

      </div>

      {/* MOBILE MENU */}
      {menuOpen && (

        <div className="md:hidden px-4 pb-6">

          <div className="bg-black/90 border border-white/10 rounded-2xl md:rounded-3xl p-5 flex flex-col gap-4">

            <Link href="/login">

              <button
                title="Login"
                className="w-full border border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white py-3 md:py-4 rounded-2xl transition"
              >
                Login
              </button>

            </Link>

            <Link href="/register">

              <button
                title="Get Started"
                className="w-full bg-blue-600 hover:bg-blue-700 py-3 md:py-4 rounded-2xl text-white font-semibold transition"
              >
                Get Started
              </button>

            </Link>

          </div>

        </div>

      )}

    </header>
  );
}