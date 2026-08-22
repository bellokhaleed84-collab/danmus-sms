"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

const NAV_ITEMS = [
  { href: "/secure-admin-portal", label: "Overview" },
  { href: "/secure-admin-portal#users", label: "Users" },
  { href: "/secure-admin-portal#transactions", label: "Transactions" },
  { href: "/secure-admin-portal#listings", label: "Listings" },
  { href: "/secure-admin-portal#service-controls", label: "Service Controls" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (!token || !user?.email) {
      router.push("/login");
      return;
    }
    if (user.role !== "admin") {
      router.push("/dashboard");
      return;
    }
    setAdminEmail(user.email);
    setChecked(true);
  }, [router]);

  if (!checked) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-14 h-14 md:w-16 md:h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
          <h1 className="text-xl md:text-3xl font-bold">Loading Admin Panel...</h1>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] transition-all duration-300 pb-16">
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/20 blur-[120px] rounded-full" />
      </div>

      <div className="flex">
        {/* SIDEBAR */}
        <aside className="hidden md:flex flex-col w-64 min-h-screen border-r border-[var(--border)] bg-[var(--card)]/70 backdrop-blur-2xl p-6">
          <h1 className="text-xl font-bold text-blue-500 mb-2">Admin</h1>
          <p className="text-gray-400 text-xs mb-8 truncate">{adminEmail}</p>

          <nav className="space-y-2 flex-1">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href.split("#")[0] && item.href === "/secure-admin-portal";
              return (
                <Link key={item.href} href={item.href}>
                  <div
                    className={`px-4 py-3 rounded-2xl font-semibold text-sm cursor-pointer transition ${
                      active ? "bg-blue-600 text-white" : "hover:bg-[var(--input)]"
                    }`}
                  >
                    {item.label}
                  </div>
                </Link>
              );
            })}
          </nav>

          <div className="space-y-2 mt-8">
            <Link href="/dashboard">
              <div className="px-4 py-3 rounded-2xl font-semibold text-sm cursor-pointer hover:bg-[var(--input)] transition">
                User Dashboard
              </div>
            </Link>
            <button
              onClick={() => {
                localStorage.clear();
                router.push("/login");
              }}
              className="w-full text-left bg-red-600 hover:bg-red-700 px-4 py-3 rounded-2xl font-semibold text-sm transition"
            >
              Logout
            </button>
          </div>
        </aside>

        {/* MOBILE TOP NAV */}
        <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-[var(--card)]/90 backdrop-blur-xl border-b border-[var(--border)] px-3 py-3 flex gap-2 overflow-x-auto">
          {NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href}>
              <div className="px-3 py-2 rounded-xl font-semibold text-xs whitespace-nowrap transition bg-[var(--input)] border border-[var(--border)]">
                {item.label}
              </div>
            </Link>
          ))}
        </div>

        {/* MAIN CONTENT */}
        <div className="flex-1 p-4 sm:p-5 md:p-10 max-w-full overflow-hidden pt-16 md:pt-10">
          {children}
        </div>
      </div>
    </main>
  );
}