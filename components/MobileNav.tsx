"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function MobileNav() {

  const pathname = usePathname();

  const navItems = [

    {
      name: "Home",
      href: "/dashboard",
      icon: "🏠",
    },

    {
      name: "Wallet",
      href: "/wallet",
      icon: "💳",
    },

    {
      name: "Buy",
      href: "/buy-number",
      icon: "📱",
    },

    {
      name: "History",
      href: "/sms-history",
      icon: "📩",
    },

    {
      name: "Settings",
      href: "/settings",
      icon: "⚙️",
    },
  ];

  return (

    <div className="fixed bottom-0 left-0 w-full md:hidden z-50 px-4 pb-4">

      <div className="bg-black/80 backdrop-blur-2xl border border-white/10 rounded-2xl md:rounded-3xl flex items-center justify-between px-4 py-3 md:py-3 shadow-2xl">

        {navItems.map((item) => (

          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center text-xs transition ${
              pathname === item.href
                ? "text-blue-500"
                : "text-gray-400"
            }`}
          >

            <span className="text-xl">
              {item.icon}
            </span>

            <span className="mt-1">
              {item.name}
            </span>

          </Link>

        ))}

      </div>

    </div>
  );
}