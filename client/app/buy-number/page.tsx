"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import MobileNav from "@/components/MobileNav";
import API from "@/lib/api";

type ProviderKey = "smspool" | "fivesim" | "grizzly";

type Option = {
  value: string;
  label: string;
  price?: number | null;
  qty?: number;
};

const PROVIDER_ORDER: ProviderKey[] = ["smspool", "fivesim", "grizzly"];
const PROVIDER_LABELS: Record<ProviderKey, string> = {
  smspool: "Provider 1",
  fivesim: "Provider 2",
  grizzly: "Provider 3",
};

export default function BuyNumberPage() {
  const [provider, setProvider] = useState<ProviderKey | null>(null);
  const [countries, setCountries] = useState<Option[]>([]);
  const [country, setCountry] = useState("");
  const [services, setServices] = useState<Option[]>([]);
  const [service, setService] = useState("");
  const [price, setPrice] = useState<number | null>(null);

  const [loadingCountries, setLoadingCountries] = useState(false);
  const [loadingServices, setLoadingServices] = useState(false);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<any>(null);
  const [sms, setSms] = useState<any>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    async function fetchUser() {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (response.ok) setBalance(data.balance || 0);
      } catch (error) {
        console.log(error);
      }
    }
    fetchUser();
  }, []);

  // When provider changes, reset everything below it and fetch that
  // provider's own country list.
  useEffect(() => {
    setCountry("");
    setService("");
    setPrice(null);
    setServices([]);
    setCountries([]);
    if (!provider) return;

    setLoadingCountries(true);
    API.get(`/sms/${provider}/countries`)
      .then((res) => setCountries(res.data || []))
      .catch((err) => {
        console.log(err);
        setCountries([]);
      })
      .finally(() => setLoadingCountries(false));
  }, [provider]);

  // When country changes, reset service/price and fetch that provider's
  // own service list for that country.
  useEffect(() => {
    setService("");
    setPrice(null);
    setServices([]);
    if (!provider || !country) return;

    setLoadingServices(true);
    API.get(`/sms/${provider}/products/${country}`)
      .then((res) => setServices(res.data || []))
      .catch((err) => {
        console.log(err);
        setServices([]);
      })
      .finally(() => setLoadingServices(false));
  }, [provider, country]);

  useEffect(() => {
    if (!service) {
      setPrice(null);
      return;
    }
    const found = services.find((s) => s.value === service);
    setPrice(found?.price ?? null);
  }, [service, services]);

  async function handleBuyNumber() {
    if (!provider || !country || !service) {
      alert("Please select provider, country and service");
      return;
    }
    if (price !== null && balance < price) {
      alert("Insufficient wallet balance");
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/sms/buy`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ provider, country, service }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setOrder({ ...data.order, provider: data.provider });
      setSms(null);
      setBalance(data.balance);
    } catch (error: any) {
      alert(error.message || "Failed to buy number");
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckSMS(silent = false) {
    if (!order) return;
    if (!silent) setChecking(true);
    try {
      const res = await API.get(`/sms/check/${order.id}?provider=${order.provider}`);
      setSms(res.data);
    } catch (error: any) {
      if (!silent) alert("Failed to check SMS. Please try again.");
    } finally {
      if (!silent) setChecking(false);
    }
  }

  useEffect(() => {
    if (!order) return;
    if (sms?.sms && sms.sms.length > 0) return;
    const interval = setInterval(() => handleCheckSMS(true), 5000);
    return () => clearInterval(interval);
  }, [order, sms]);

  function startOver() {
    setOrder(null);
    setSms(null);
    setProvider(null);
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] transition-all duration-300">
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/20 blur-[120px] rounded-full" />
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 mb-10">
          <div>
            <h1 className="text-2xl md:text-5xl font-bold">Buy Number</h1>
            <p className="text-gray-400 mt-3 text-lg">Purchase virtual numbers instantly</p>
          </div>
          <Link href="/dashboard">
            <button className="bg-blue-600 hover:bg-blue-700 px-4 md:px-6 py-3 rounded-2xl font-semibold transition shadow-xl">
              Back Dashboard
            </button>
          </Link>
        </div>

        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-[32px] p-6 md:p-10 shadow-2xl text-white mb-10">
          <p className="text-lg opacity-80">Wallet Balance</p>
          <h2 className="text-2xl md:text-6xl font-bold mt-4">₦{Number(balance).toLocaleString()}</h2>
          <div className="mt-8">
            <Link href="/add-funds">
              <button className="bg-white text-black hover:bg-gray-200 px-4 md:px-6 py-3 rounded-2xl font-semibold transition">
                Add Funds
              </button>
            </Link>
          </div>
        </div>

        {order ? (
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-[32px] p-6 md:p-10 shadow-2xl mb-10">
            <h2 className="text-2xl font-bold mb-6 text-green-400">Number Purchased!</h2>
            <div className="space-y-3 text-lg">
              <p><span className="text-gray-400">Phone Number:</span> <span className="font-bold text-blue-400">{order.phone}</span></p>
              <p><span className="text-gray-400">Service:</span> {order.service}</p>
              <p><span className="text-gray-400">Country:</span> {order.country}</p>
              <p><span className="text-gray-400">Price:</span> ₦{order.price?.toLocaleString()}</p>
            </div>

            {sms?.sms && sms.sms.length > 0 ? (
              <div className="mt-6 bg-green-600/20 border border-green-600 rounded-2xl p-5">
                <h3 className="text-green-400 font-bold text-xl mb-2">SMS Received!</h3>
                <p className="text-2xl font-bold">{sms.sms[0].code}</p>
                <p className="text-gray-400 text-sm mt-1">{sms.sms[0].text}</p>
              </div>
            ) : (
              <div className="mt-6 bg-yellow-600/20 border border-yellow-600 rounded-2xl p-5 flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
                <p className="text-yellow-400 font-medium">Waiting for SMS... we&apos;ll check automatically every few seconds</p>
              </div>
            )}

            <div className="flex gap-4 mt-8">
              <button
                onClick={() => handleCheckSMS(false)}
                disabled={checking}
                className="flex-1 bg-blue-600 hover:bg-blue-700 py-4 rounded-2xl font-bold transition"
              >
                {checking ? "Checking..." : "Check SMS Now"}
              </button>
              <button
                onClick={startOver}
                className="flex-1 bg-gray-700 hover:bg-gray-600 py-4 rounded-2xl font-bold transition"
              >
                Buy Another
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-[32px] p-6 md:p-10 shadow-2xl">
            <h2 className="text-2xl md:text-3xl font-bold mb-8">Purchase Number</h2>

            {/* STEP 1: Provider */}
            <div>
              <label className="block mb-3 text-lg font-semibold">Select Provider</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {PROVIDER_ORDER.map((p) => {
                  const active = provider === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setProvider(p)}
                      className={`rounded-2xl border p-5 text-left transition ${
                        active ? "border-blue-500 bg-blue-600/10" : "border-[var(--border)] bg-[var(--input)] hover:border-blue-500/50"
                      }`}
                    >
                      <p className="font-bold">{PROVIDER_LABELS[p]}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* STEP 2: Country (scoped to chosen provider) */}
            {provider && (
              <div className="mt-8">
                <label htmlFor="country" className="block mb-3 text-lg font-semibold">
                  Select Country
                </label>
                <select
                  id="country"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  disabled={loadingCountries}
                  className="w-full bg-[var(--input)] border border-[var(--border)] rounded-2xl px-5 py-3 md:py-4 outline-none focus:border-blue-500 disabled:opacity-50"
                >
                  <option value="">{loadingCountries ? "Loading..." : "Choose country"}</option>
                  {countries.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
                {!loadingCountries && countries.length === 0 && (
                  <p className="text-sm text-gray-400 mt-2">No countries available for this provider right now.</p>
                )}
              </div>
            )}

            {/* STEP 3: Service (scoped to chosen provider + country) */}
            {provider && country && (
              <div className="mt-8">
                <label htmlFor="service" className="block mb-3 text-lg font-semibold">
                  Select Service
                </label>
                <select
                  id="service"
                  value={service}
                  onChange={(e) => setService(e.target.value)}
                  disabled={loadingServices}
                  className="w-full bg-[var(--input)] border border-[var(--border)] rounded-2xl px-5 py-3 md:py-4 outline-none focus:border-blue-500 disabled:opacity-50"
                >
                  <option value="">{loadingServices ? "Loading..." : "Choose service"}</option>
                  {services.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                      {s.price != null ? ` — ₦${s.price.toLocaleString()}` : " — price at checkout"}
                    </option>
                  ))}
                </select>
                {!loadingServices && services.length === 0 && (
                  <p className="text-sm text-gray-400 mt-2">No services available for this country right now.</p>
                )}
              </div>
            )}

            <div className="bg-[var(--input)] border border-[var(--border)] rounded-2xl md:rounded-3xl p-5 md:p-8 mt-10">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div>
                  <h3 className="text-2xl font-bold">Estimated Price</h3>
                  <p className="text-gray-400 mt-2">Price may vary based on availability</p>
                </div>
                <h2 className="text-2xl md:text-5xl font-bold text-blue-500">
                  {!service ? "Select options" : price != null ? `₦${price.toLocaleString()}` : "Confirmed at checkout"}
                </h2>
              </div>
            </div>

            <button
              onClick={handleBuyNumber}
              disabled={loading || !provider || !country || !service}
              className="w-full bg-blue-600 hover:bg-blue-700 py-5 rounded-2xl font-bold text-lg transition shadow-xl mt-10 disabled:opacity-50"
            >
              {loading ? "Purchasing..." : "Buy Number"}
            </button>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-6 mt-10">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl md:rounded-3xl p-5 md:p-8 shadow-xl">
            <div className="text-5xl mb-5">⚡</div>
            <h3 className="text-2xl font-bold">Instant Delivery</h3>
            <p className="text-gray-400 mt-3">Receive numbers immediately after purchase</p>
          </div>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl md:rounded-3xl p-5 md:p-8 shadow-xl">
            <div className="text-5xl mb-5">🌍</div>
            <h3 className="text-2xl font-bold">Global Countries</h3>
            <p className="text-gray-400 mt-3">Access numbers from multiple countries</p>
          </div>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl md:rounded-3xl p-5 md:p-8 shadow-xl">
            <div className="text-5xl mb-5">🔒</div>
            <h3 className="text-2xl font-bold">Secure Platform</h3>
            <p className="text-gray-400 mt-3">Safe and reliable OTP services</p>
          </div>
        </div>
      </div>

      <MobileNav />
    </main>
  );
}