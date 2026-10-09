"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import MobileNav from "@/components/MobileNav";
import API from "@/lib/api";

type Service = {
  id: string;
  name: string;
  category: string;
  type: string;
  min: number;
  max: number;
  ratePerThousand: number; // NGN
};

function BoostApp() {
  const [services, setServices] = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);

  const [category, setCategory] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [link, setLink] = useState("");
  const [quantity, setQuantity] = useState("");

  const [balance, setBalance] = useState(0);
  const [placing, setPlacing] = useState(false);
  const [order, setOrder] = useState<any>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const token = localStorage.getItem("token");
        const res = await API.get("/boost/services", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setServices(res.data || []);
      } catch (error) {
        console.log(error);
      }
      setLoadingServices(false);
    }
    load();
  }, []);

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

  const categories = useMemo(() => {
    const set = new Set(services.map((s) => s.category).filter(Boolean));
    return Array.from(set);
  }, [services]);

  const servicesInCategory = useMemo(
    () => services.filter((s) => s.category === category),
    [services, category]
  );

  const selectedService = useMemo(
    () => servicesInCategory.find((s) => s.id === serviceId) || null,
    [servicesInCategory, serviceId]
  );

  const qtyNum = Number(quantity) || 0;
  const price = selectedService
    ? Math.ceil((selectedService.ratePerThousand / 1000) * qtyNum)
    : null;

  const quantityValid =
    selectedService &&
    qtyNum >= selectedService.min &&
    (selectedService.max === 0 || qtyNum <= selectedService.max);

  function handleCategoryChange(value: string) {
    setCategory(value);
    setServiceId("");
    setQuantity("");
  }

  function handleServiceChange(value: string) {
    setServiceId(value);
    setQuantity("");
  }

  async function handlePlaceOrder() {
    if (!selectedService || !link || !quantityValid) {
      alert("Please fill in all fields correctly");
      return;
    }
    if (price !== null && balance < price) {
      alert("Insufficient wallet balance");
      return;
    }
    setPlacing(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/boost/order`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ serviceId: selectedService.id, link, quantity: qtyNum }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setOrder(data.order);
      setBalance(data.balance);
    } catch (error: any) {
      alert(error.message || "Failed to place order");
    } finally {
      setPlacing(false);
    }
  }

  async function handleCheckStatus() {
    if (!order) return;
    setChecking(true);
    try {
      const res = await API.get(`/boost/orders/${order._id}/status`);
      setOrder(res.data);
    } catch (error: any) {
      alert(error.response?.data?.message || "Failed to check status");
    } finally {
      setChecking(false);
    }
  }

  function startOver() {
    setOrder(null);
    setCategory("");
    setServiceId("");
    setLink("");
    setQuantity("");
  }

  const statusColors: any = {
    pending: "bg-yellow-500/20 text-yellow-500",
    in_progress: "bg-blue-500/20 text-blue-400",
    completed: "bg-green-500/20 text-green-500",
    partial: "bg-orange-500/20 text-orange-400",
    canceled: "bg-gray-500/20 text-gray-400",
    failed: "bg-red-500/20 text-red-500",
    refunded: "bg-gray-500/20 text-gray-400",
  };

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 mb-10">
          <div>
            <h1 className="text-2xl md:text-5xl font-bold">Boost</h1>
            <p className="text-gray-400 mt-3 text-lg">Grow your social media presence instantly</p>
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
            <div className="flex items-center justify-between flex-wrap gap-2 mb-6">
              <h2 className="text-2xl font-bold text-green-400">Order Placed!</h2>
              <span className={`px-3 py-1 rounded-xl text-xs font-semibold capitalize ${statusColors[order.status] || ""}`}>
                {order.status?.replace("_", " ")}
              </span>
            </div>
            <div className="space-y-3 text-lg">
              <p><span className="text-gray-400">Service:</span> {order.serviceName}</p>
              <p><span className="text-gray-400">Link:</span> <span className="break-all">{order.link}</span></p>
              <p><span className="text-gray-400">Quantity:</span> {order.quantity?.toLocaleString()}</p>
              <p><span className="text-gray-400">Price:</span> ₦{order.price?.toLocaleString()}</p>
              {order.remains != null && (
                <p><span className="text-gray-400">Remaining:</span> {order.remains?.toLocaleString()}</p>
              )}
            </div>

            <div className="flex gap-4 mt-8">
              <button
                onClick={handleCheckStatus}
                disabled={checking}
                className="flex-1 bg-blue-600 hover:bg-blue-700 py-4 rounded-2xl font-bold transition disabled:opacity-50"
              >
                {checking ? "Checking..." : "Check Status"}
              </button>
              <button
                onClick={startOver}
                className="flex-1 bg-gray-700 hover:bg-gray-600 py-4 rounded-2xl font-bold transition"
              >
                New Order
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-[32px] p-6 md:p-10 shadow-2xl">
            <h2 className="text-2xl md:text-3xl font-bold mb-8">Place Boost Order</h2>

            <div>
              <label className="block mb-3 text-lg font-semibold">Category</label>
              <select
                value={category}
                onChange={(e) => handleCategoryChange(e.target.value)}
                disabled={loadingServices}
                className="w-full bg-[var(--input)] border border-[var(--border)] rounded-2xl px-5 py-3 md:py-4 outline-none focus:border-blue-500 disabled:opacity-50"
              >
                <option value="">{loadingServices ? "Loading..." : "Choose category"}</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {category && (
              <div className="mt-8">
                <label className="block mb-3 text-lg font-semibold">Service</label>
                <select
                  value={serviceId}
                  onChange={(e) => handleServiceChange(e.target.value)}
                  className="w-full bg-[var(--input)] border border-[var(--border)] rounded-2xl px-5 py-3 md:py-4 outline-none focus:border-blue-500"
                >
                  <option value="">Choose service</option>
                  {servicesInCategory.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} — ₦{s.ratePerThousand.toLocaleString()}/1000
                    </option>
                  ))}
                </select>
              </div>
            )}

            {selectedService && (
              <>
                <div className="mt-8">
                  <label className="block mb-3 text-lg font-semibold">Link</label>
                  <input
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                    placeholder="https://instagram.com/yourprofile or post link"
                    className="w-full bg-[var(--input)] border border-[var(--border)] rounded-2xl px-5 py-3 md:py-4 outline-none focus:border-blue-500"
                  />
                </div>

                <div className="mt-8">
                  <label className="block mb-3 text-lg font-semibold">
                    Quantity (min {selectedService.min.toLocaleString()}
                    {selectedService.max ? `, max ${selectedService.max.toLocaleString()}` : ""})
                  </label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder={`e.g. ${selectedService.min}`}
                    className="w-full bg-[var(--input)] border border-[var(--border)] rounded-2xl px-5 py-3 md:py-4 outline-none focus:border-blue-500"
                  />
                  {quantity && !quantityValid && (
                    <p className="text-sm text-red-400 mt-2">
                      Quantity must be between {selectedService.min.toLocaleString()} and{" "}
                      {selectedService.max ? selectedService.max.toLocaleString() : "no limit"}
                    </p>
                  )}
                </div>
              </>
            )}

            <div className="bg-[var(--input)] border border-[var(--border)] rounded-2xl md:rounded-3xl p-5 md:p-8 mt-10">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div>
                  <h3 className="text-2xl font-bold">Estimated Price</h3>
                  <p className="text-gray-400 mt-2">Based on quantity entered</p>
                </div>
                <h2 className="text-2xl md:text-5xl font-bold text-blue-500">
                  {!selectedService || !qtyNum ? "Select options" : `₦${(price || 0).toLocaleString()}`}
                </h2>
              </div>
            </div>

            <button
              onClick={handlePlaceOrder}
              disabled={placing || !selectedService || !link || !quantityValid}
              className="w-full bg-blue-600 hover:bg-blue-700 py-5 rounded-2xl font-bold text-lg transition shadow-xl mt-10 disabled:opacity-50"
            >
              {placing ? "Placing Order..." : "Boost Now"}
            </button>
          </div>
        )}
      </div>

      <MobileNav />
    </main>
  );
}

export default function BoostPage() {
  const [access, setAccess] = useState<"loading" | "open" | "closed">("loading");

  useEffect(() => {
    async function check() {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setAccess("closed");
          return;
        }
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/boost/access`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setAccess(res.ok && data.open ? "open" : "closed");
      } catch {
        setAccess("closed");
      }
    }
    check();
  }, []);

  if (access === "loading") {
    return (
      <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </main>
    );
  }

  if (access === "closed") {
    return (
      <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <h1 className="text-3xl md:text-4xl font-bold">Boost is coming soon 🚀</h1>
          <p className="text-gray-400 mt-4 text-lg">
            Get followers, likes and views straight from your wallet. We&apos;ll launch very shortly.
          </p>
          <Link href="/dashboard">
            <button className="mt-8 bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-2xl font-semibold transition">
              Back to Dashboard
            </button>
          </Link>
        </div>
        <MobileNav />
      </main>
    );
  }

  return <BoostApp />;
}