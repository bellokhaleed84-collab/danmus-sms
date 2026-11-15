"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import MobileNav from "@/components/MobileNav";
import API from "@/lib/api";

type Option = { value: string; label: string };

type NumberItem = {
  phoneNumber: string;
  country: string;
  numberType: string;
  region: string;
  features: string[];
  price: number;
  renewalPrice: number;
  quote: string;
};

const TYPE_LABELS: Record<string, string> = {
  local: "Local",
  toll_free: "Toll-free",
  mobile: "Mobile",
  national: "National",
};

const NAIRA = "\u20A6";

export default function RentNumberPage() {
  const router = useRouter();

  const [access, setAccess] = useState<"loading" | "open" | "closed" | "login">("loading");
  const [balance, setBalance] = useState(0);

  const [countries, setCountries] = useState<Option[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [country, setCountry] = useState("");
  const [type, setType] = useState("");
  const [startsWith, setStartsWith] = useState("");

  const [numbers, setNumbers] = useState<NumberItem[]>([]);
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  const [selected, setSelected] = useState<NumberItem | null>(null);
  const [renting, setRenting] = useState(false);
  const [rentError, setRentError] = useState("");

  useEffect(() => {
    async function init() {
      const token = localStorage.getItem("token");
      if (!token) {
        setAccess("login");
        return;
      }
      try {
        const acc = await API.get("/numbers/access");
        if (!acc.data.open) {
          setAccess("closed");
          return;
        }
        const [list, profile] = await Promise.all([
          API.get("/numbers/countries"),
          API.get("/users/profile"),
        ]);
        setCountries(list.data.countries || []);
        setTypes(list.data.types || []);
        setBalance(profile.data.balance || 0);
        setAccess("open");
      } catch (e: any) {
        if (e.response?.status === 401) {
          setAccess("login");
          return;
        }
        setAccess("closed");
      }
    }
    init();
  }, []);

  async function handleSearch() {
    if (!country) return;
    setSearching(true);
    setSearchError("");
    setNumbers([]);
    setSearched(false);
    try {
      const res = await API.get("/numbers/available", {
        params: { country, type, startsWith },
      });
      setNumbers(res.data.numbers || []);
      setSearched(true);
    } catch (e: any) {
      setSearchError(e.response?.data?.message || "Could not load numbers. Please try again.");
    } finally {
      setSearching(false);
    }
  }

  function openRent(n: NumberItem) {
    setSelected(n);
    setRentError("");
  }

  async function handleRent() {
    if (!selected) return;
    setRenting(true);
    setRentError("");
    try {
      const res = await API.post("/numbers/rent", { quote: selected.quote });
      if (typeof res.data.balance === "number") setBalance(res.data.balance);
      alert(res.status === 202 ? res.data.message : "Number rented successfully!");
      router.push("/numbers/mine");
    } catch (e: any) {
      setRentError(e.response?.data?.message || "Could not rent this number. Please try again.");
      if (typeof e.response?.data?.balance === "number") setBalance(e.response.data.balance);
      setRenting(false);
    }
  }

  if (access === "loading") {
    return (
      <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </main>
    );
  }

  if (access === "login") {
    return (
      <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col items-center justify-center gap-4">
        <p className="text-gray-400">Please log in to rent a number.</p>
        <Link href="/login" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-bold">
          Log in
        </Link>
      </main>
    );
  }

  if (access === "closed") {
    return (
      <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <h1 className="text-3xl md:text-4xl font-bold">Number Rental is coming soon</h1>
          <p className="text-gray-400 mt-4 text-lg">
            Rent a real number for a month to receive SMS and make calls. We will launch very shortly.
          </p>
          <Link href="/dashboard">
            <button className="mt-8 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-semibold transition">
              Back to Dashboard
            </button>
          </Link>
        </div>
        <MobileNav />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] pb-28 md:pb-0">
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/20 blur-[120px] rounded-full" />
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-10">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 mb-8">
          <div>
            <h1 className="text-2xl md:text-5xl font-bold">Rent a Number</h1>
            <p className="text-gray-400 mt-3 text-lg">
              Keep a real number for a month. Receive SMS on it any time.
            </p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <Link href="/numbers/mine">
              <button className="bg-[var(--card)] border border-[var(--border)] hover:border-blue-500 px-5 py-3 rounded-2xl font-semibold transition">
                My Numbers
              </button>
            </Link>
            <Link href="/dashboard">
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-2xl font-semibold transition shadow-xl">
                Back Dashboard
              </button>
            </Link>
          </div>
        </div>

        {/* BALANCE */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-[28px] p-6 md:p-8 shadow-2xl text-white mb-8 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="opacity-80">Wallet Balance</p>
            <h2 className="text-3xl md:text-5xl font-bold mt-2">
              {NAIRA}
              {Number(balance).toLocaleString()}
            </h2>
          </div>
          <Link href="/fund">
            <button className="bg-white text-black hover:bg-gray-200 px-5 py-3 rounded-2xl font-semibold transition">
              Add Funds
            </button>
          </Link>
        </div>

        {/* SEARCH */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-[28px] p-6 md:p-8 shadow-xl mb-8">
          <h2 className="text-xl md:text-2xl font-bold mb-6">Find a number</h2>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block mb-2 text-sm font-semibold">Country</label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full bg-[var(--input)] border border-[var(--border)] rounded-2xl px-4 py-3 outline-none focus:border-blue-500"
              >
                <option value="">Choose country</option>
                {countries.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block mb-2 text-sm font-semibold">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full bg-[var(--input)] border border-[var(--border)] rounded-2xl px-4 py-3 outline-none focus:border-blue-500"
              >
                <option value="">Any type</option>
                {types.map((t) => (
                  <option key={t} value={t}>
                    {TYPE_LABELS[t] || t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block mb-2 text-sm font-semibold">Starts with (optional)</label>
              <input
                value={startsWith}
                onChange={(e) => setStartsWith(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="e.g. 212"
                inputMode="numeric"
                className="w-full bg-[var(--input)] border border-[var(--border)] rounded-2xl px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <button
            onClick={handleSearch}
            disabled={!country || searching}
            className="w-full md:w-auto mt-6 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-2xl font-bold transition disabled:opacity-50"
          >
            {searching ? "Searching..." : "Search numbers"}
          </button>
        </div>

        {/* RESULTS */}
        {searchError && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-2xl p-4 mb-6 text-sm">
            {searchError}
          </div>
        )}

        {searched && numbers.length === 0 && !searchError && (
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-10 text-center">
            <p className="font-bold text-lg">No numbers available</p>
            <p className="text-gray-400 text-sm mt-1">Try another country, type or starting digits.</p>
          </div>
        )}

        {numbers.length > 0 && (
          <div className="grid md:grid-cols-2 gap-5">
            {numbers.map((n) => (
              <div
                key={n.phoneNumber}
                className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-6 shadow-xl flex flex-col"
              >
                <p className="text-2xl font-bold tracking-wide">{n.phoneNumber}</p>
                <p className="text-gray-400 text-sm mt-1">
                  {n.region || n.country}
                  {n.numberType ? ` \u00B7 ${TYPE_LABELS[n.numberType] || n.numberType}` : ""}
                </p>

                <div className="flex gap-2 flex-wrap mt-3">
                  {n.features.includes("sms") && (
                    <span className="bg-green-500/20 text-green-500 text-xs font-bold px-3 py-1 rounded-full">SMS</span>
                  )}
                  {n.features.includes("voice") && (
                    <span className="bg-blue-500/20 text-blue-400 text-xs font-bold px-3 py-1 rounded-full">Voice</span>
                  )}
                </div>

                <div className="flex items-end justify-between mt-auto pt-5">
                  <div>
                    <p className="text-blue-500 font-bold text-xl">
                      {NAIRA}
                      {n.price.toLocaleString()}
                    </p>
                    <p className="text-gray-400 text-xs mt-1">
                      first month, then {NAIRA}
                      {n.renewalPrice.toLocaleString()}/mo
                    </p>
                  </div>
                  <button
                    onClick={() => openRent(n)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl font-bold transition"
                  >
                    Rent
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CONFIRM MODAL */}
      {selected && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold">Rent this number?</h2>
            <p className="text-2xl font-bold tracking-wide mt-3">{selected.phoneNumber}</p>
            <p className="text-gray-400 text-sm mt-1">{selected.region || selected.country}</p>

            <div className="bg-[var(--input)] border border-[var(--border)] rounded-2xl p-4 mt-5 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Charged now</span>
                <span className="font-bold">
                  {NAIRA}
                  {selected.price.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Rental period</span>
                <span className="font-bold">30 days</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Renews at</span>
                <span className="font-bold">
                  {NAIRA}
                  {selected.renewalPrice.toLocaleString()}/mo
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Your balance</span>
                <span className="font-bold">
                  {NAIRA}
                  {Number(balance).toLocaleString()}
                </span>
              </div>
            </div>

            {rentError && (
              <p className="text-red-400 text-sm mt-4">
                {rentError}{" "}
                {rentError.toLowerCase().includes("insufficient") && (
                  <Link href="/fund" className="underline text-blue-400">
                    Add funds
                  </Link>
                )}
              </p>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setSelected(null)}
                disabled={renting}
                className="flex-1 bg-[var(--input)] border border-[var(--border)] py-3 rounded-xl font-semibold disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRent}
                disabled={renting}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold disabled:opacity-50"
              >
                {renting ? "Renting..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      <MobileNav />
    </main>
  );
}