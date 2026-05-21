import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="flex items-center justify-between px-8 py-6 border-b border-[var(--border)]">

      <Link href="/">
        <h1 className="text-2xl font-bold text-blue-500 cursor-pointer">
          Danmus SMS
        </h1>
      </Link>

      <div className="flex gap-4">

        <Link href="/login">
          <button className="px-5 py-2 rounded-lg border border-gray-700 hover:bg-gray-800 transition">
            Login
          </button>
        </Link>

        <Link href="/register">
          <button className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition">
            Register
          </button>
        </Link>

      </div>

    </nav>
  );
}