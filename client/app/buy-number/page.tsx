"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import MobileNav from "@/components/MobileNav";
import API from "@/lib/api";

export default function BuyNumberPage() {
  const [countries, setCountries] = useState<any>({});
  const [services, setServices] = useState<any>({});
  const [country, setCountry] = useState("");
  const [service, setService] = useState("");
  const [price, setPrice] = useState<number | null>(null);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<any>(null);
  const [sms, setSms] = useState<any>(null);
  const [checking, setChecking] = useState(false);

  // Fetch user balance
  useEffect(() => {
    async function fetchUser() {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/users/profile`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const data = await response.json();
        if (response.ok) setBalance(data.balance || 0);
      } catch (error) {
        console.log(error);
      }
    }
    fetchUser();
  }, []);

  // Fetch countries on load
  useEffect(() => {
    async function fetchCountries() {
      try {
        const res = await API.get("/sms/countries");
        setCountries(res.data);
      } catch (error) {
        console.log(error);
      }
    }
    fetchCountries();
  }, []);

  // Fetch products (services + prices) when country changes
  useEffect(() => {
    if (!country) return;
    setService("");
    setPrice(null);
    async function fetchProducts() {
      try {
        const res = await API.get(`/sms/products/${country}`);
        setServices(res.data);
      } catch (error) {
        console.log(error);
        setServices({});
      }
    }
    fetchProducts();
  }, [country]);

  // Set price when service changes (price already included in products response)
  useEffect(() => {
    if (!service || !services[service]) {
      setPrice(null);
      return;
    }
    setPrice(services[service].Price);
  }, [service, services]);

  // Buy number
  async function handleBuyNumber() {
    if (!country || !service || !price) {
      alert("Please select country and service");
      return;
    }
    if (balance < price) {
      alert("Insufficient wallet balance");
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/sms/buy`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ country, service, price }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setOrder(data.order);
      setSms(null);
      setBalance(data.balance);
    } catch (error: any) {
      alert(error.message || "Failed to buy number");
    } finally {
      setLoading(false);
    }
  }

  // Check SMS
  async function handleCheckSMS(silent = false) {
    if (!order) return;
    if (!silent) setChecking(true);
    try {
      const res = await API.get(`/sms/check/${order.id}`);
      setSms(res.data);
    } catch (error: any) {
      if (!silent) alert("Failed to check SMS. Please try again.");
    } finally {
      if (!silent) setChecking(false);
    }
  }

  // Auto-poll for SMS every 5 seconds while waiting
  useEffect(() => {
    if (!order) return;
    if (sms?.sms && sms.sms.length > 0) return; // stop polling once received

    const interval = setInterval(() => {
      handleCheckSMS(true);
    }, 5000);

    return () => clearInterval(interval);
  }, [order, sms]);

  // Cancel order
  async function handleCancel() {
    if (!order) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/sms/cancel/${order.id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      alert("Order cancelled. Balance refunded.");
      setOrder(null);
      setSms(null);
      setBalance(data.balance);
    } catch (error: any) {
      alert(error.message || "Failed to cancel");
    }
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] transition-all duration-300">

      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/20 blur-[120px] rounded-full" />
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-10">

        {/* HEADER */}
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

        {/* WALLET CARD */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-[32px] p-6 md:p-10 shadow-2xl text-white mb-10">
          <p className="text-lg opacity-80">Wallet Balance</p>
          <h2 className="text-2xl md:text-6xl font-bold mt-4">
            ₦{Number(balance).toLocaleString()}
          </h2>
          <div className="mt-8">
            <Link href="/add-funds">
              <button className="bg-white text-black hover:bg-gray-200 px-4 md:px-6 py-3 rounded-2xl font-semibold transition">
                Add Funds
              </button>
            </Link>
          </div>
        </div>

        {/* ORDER RESULT */}
        {order ? (
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-[32px] p-6 md:p-10 shadow-2xl mb-10">
            <h2 className="text-2xl font-bold mb-6 text-green-400">Number Purchased!</h2>
            <div className="space-y-3 text-lg">
              <p><span className="text-gray-400">Phone Number:</span> <span className="font-bold text-blue-400">{order.phone}</span></p>
              <p><span className="text-gray-400">Service:</span> {order.service}</p>
              <p><span className="text-gray-400">Country:</span> {order.country}</p>
              <p><span className="text-gray-400">Price:</span> ₦{order.price?.toLocaleString()}</p>
            </div>

            {/* SMS RESULT */}
            {sms?.sms && sms.sms.length > 0 ? (
              <div className="mt-6 bg-green-600/20 border border-green-600 rounded-2xl p-5">
                <h3 className="text-green-400 font-bold text-xl mb-2">SMS Received!</h3>
                <p className="text-2xl font-bold">{sms.sms[0].code}</p>
                <p className="text-gray-400 text-sm mt-1">{sms.sms[0].text}</p>
              </div>
            ) : (
              <div className="mt-6 bg-yellow-600/20 border border-yellow-600 rounded-2xl p-5 flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
                <p className="text-yellow-400 font-medium">
                  Waiting for SMS... we&apos;ll check automatically every few seconds
                </p>
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
                onClick={handleCancel}
                className="flex-1 bg-red-600 hover:bg-red-700 py-4 rounded-2xl font-bold transition"
              >
                Cancel & Refund
              </button>
            </div>
          </div>
        ) : (

          /* BUY CARD */
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-[32px] p-6 md:p-10 shadow-2xl">
            <h2 className="text-2xl md:text-3xl font-bold mb-8">Purchase Number</h2>

            <div className="grid md:grid-cols-2 gap-5 md:p-8">

              {/* COUNTRY */}
              <div>
                <label htmlFor="country" className="block mb-3 text-lg font-semibold">
                  Select Country
                </label>

                <select
                  id="country"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full bg-[var(--input)] border border-[var(--border)] rounded-2xl px-5 py-3 md:py-4 outline-none focus:border-blue-500"
                >
                  <option value="">Choose country</option>
                  {Object.keys(countries).map((c) => (
                    <option key={c} value={c}>
                      {countries[c].text_en || c}
                    </option>
                  ))}
                </select>
              </div>

              {/* SERVICE */}
              <div>
                <label htmlFor="service" className="block mb-3 text-lg font-semibold">
                  Select Service
                </label>

                <select
                  id="service"
                  value={service}
                  onChange={(e) => setService(e.target.value)}
                  disabled={!country}
                  className="w-full bg-[var(--input)] border border-[var(--border)] rounded-2xl px-5 py-3 md:py-4 outline-none focus:border-blue-500 disabled:opacity-50"
                >
                  <option value="">Choose service</option>
                  {Object.keys(services)
                    .filter((s) => services[s]?.Qty > 0)
                    .map((s) => (
                      <option key={s} value={s}>
                        {s} — ₦{services[s].Price?.toLocaleString()}
                      </option>
                    ))}
                </select>
              </div>

            </div>

            {/* PRICE CARD */}
            <div className="bg-[var(--input)] border border-[var(--border)] rounded-2xl md:rounded-3xl p-5 md:p-8 mt-10">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div>
                  <h3 className="text-2xl font-bold">Estimated Price</h3>
                  <p className="text-gray-400 mt-2">Price may vary based on availability</p>
                </div>
                <h2 className="text-2xl md:text-5xl font-bold text-blue-500">
                  {price ? `₦${price.toLocaleString()}` : "Select options"}
                </h2>
              </div>
            </div>

            <button
              onClick={handleBuyNumber}
              disabled={loading || !price}
              className="w-full bg-blue-600 hover:bg-blue-700 py-5 rounded-2xl font-bold text-lg transition shadow-xl mt-10 disabled:opacity-50"
            >
              {loading ? "Purchasing..." : "Buy Number"}
            </button>
          </div>
        )}

        {/* FEATURES */}
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