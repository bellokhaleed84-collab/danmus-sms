"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import MobileNav from "@/components/MobileNav";
import API from "@/lib/api";

type Product = {
  id: number;
  categoryId: number;
  categoryName: string;
  name: string;
  description: string;
  image: string;
  inStock: boolean;
  unitPrice: number;
};

type Category = { id: number; name: string };

const MAX_QTY = 50;

export default function StorePage() {
  const router = useRouter();
  const [access, setAccess] = useState<"loading" | "open" | "closed" | "login">("loading");
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const [selected, setSelected] = useState<Product | null>(null);
  const [qty, setQty] = useState(1);
  const [buying, setBuying] = useState(false);
  const [buyError, setBuyError] = useState("");

  useEffect(() => {
    async function init() {
      const token = localStorage.getItem("token");
      if (!token) {
        setAccess("login");
        return;
      }
      const headers = { Authorization: `Bearer ${token}` };
      try {
        const acc = await API.get("/store/access", { headers });
        if (!acc.data.open) {
          setAccess("closed");
          return;
        }
        const res = await API.get("/store/catalog", { headers });
        setProducts(res.data.products);
        setCategories(res.data.categories);
        setAccess("open");
      } catch (e: any) {
        if (e.response?.status === 401) {
          setAccess("login");
          return;
        }
        setError(e.response?.data?.message || "Could not load the store. Please try again.");
        setAccess("open");
      }
    }
    init();
  }, []);

  const visible = useMemo(
    () => (categoryId === null ? products : products.filter((p) => p.categoryId === categoryId)),
    [products, categoryId]
  );

  function openBuy(p: Product) {
    setSelected(p);
    setQty(1);
    setBuyError("");
  }

  async function handleBuy() {
    if (!selected) return;
    const token = localStorage.getItem("token");
    setBuying(true);
    setBuyError("");
    try {
      const res = await API.post(
        "/store/order",
        { productId: selected.id, quantity: qty },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      router.push(`/marketplace/store/orders/${res.data.order._id}`);
    } catch (e: any) {
      setBuyError(e.response?.data?.message || "Purchase failed. Please try again.");
      setBuying(false);
    }
  }

  if (access === "loading") {
    return (
      <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex items-center justify-center">
        <p className="text-gray-400">Loading store...</p>
      </main>
    );
  }

  if (access === "login") {
    return (
      <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col items-center justify-center gap-4">
        <p className="text-gray-400">Please log in to use the store.</p>
        <Link href="/login" className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-2xl font-bold">
          Log in
        </Link>
      </main>
    );
  }

  if (access === "closed") {
    return (
      <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-3xl font-bold">Instant Accounts Store</h1>
        <p className="text-gray-400">Coming soon.</p>
        <Link href="/marketplace" className="text-blue-400 hover:underline">
          {"\u2190"} Back to Marketplace
        </Link>
        <MobileNav />
      </main>
    );
  }

  const total = selected ? selected.unitPrice * qty : 0;

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/20 blur-[120px] rounded-full" />
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-10 pb-28">
        <Link href="/marketplace">
          <button className="text-gray-400 hover:text-white mb-6">{"\u2190"} Back to Marketplace</button>
        </Link>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-5xl font-bold">Instant Accounts Store</h1>
            <p className="text-gray-400 mt-3 text-lg">Pay from your wallet. Login details delivered instantly.</p>
          </div>
          <Link href="/marketplace/store/orders">
            <button className="bg-[var(--card)] border border-[var(--border)] hover:border-blue-500 px-5 py-3 rounded-2xl font-semibold transition">
              My Store Orders
            </button>
          </Link>
        </div>

        {error && <p className="text-red-400 mb-6">{error}</p>}

        <div className="flex gap-3 mb-8 overflow-x-auto pb-2">
          <button
            onClick={() => setCategoryId(null)}
            className={`px-5 py-2 rounded-2xl font-semibold whitespace-nowrap transition ${
              categoryId === null
                ? "bg-blue-600 text-white"
                : "bg-[var(--card)] border border-[var(--border)] text-gray-400"
            }`}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategoryId(c.id)}
              className={`px-5 py-2 rounded-2xl font-semibold whitespace-nowrap transition ${
                categoryId === c.id
                  ? "bg-blue-600 text-white"
                  : "bg-[var(--card)] border border-[var(--border)] text-gray-400"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        {visible.length === 0 ? (
          <p className="text-gray-400">No items available right now.</p>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {visible.map((p) => (
              <div
                key={p.id}
                className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-6 shadow-xl flex flex-col"
              >
                <div className="flex items-center gap-3">
                  {p.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.image}
                      alt=""
                      className="w-12 h-12 rounded-xl object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = "none";
                      }}
                    />
                  )}
                  <span className="inline-block bg-blue-600/20 text-blue-400 text-xs font-bold px-3 py-1 rounded-full uppercase">
                    {p.categoryName}
                  </span>
                </div>
                <h3 className="text-xl font-bold mt-4">{p.name}</h3>
                {p.description && (
                  <p className="text-gray-400 text-sm mt-2 line-clamp-3">{p.description}</p>
                )}
                <div className="flex items-center justify-between mt-auto pt-5">
                  <span className="text-blue-500 font-bold text-lg">
                    {"\u20A6"}{p.unitPrice.toLocaleString()}
                  </span>
                  {p.inStock ? (
                    <button
                      onClick={() => openBuy(p)}
                      className="bg-blue-600 hover:bg-blue-700 px-5 py-2 rounded-xl font-bold transition"
                    >
                      Buy
                    </button>
                  ) : (
                    <span className="text-gray-500 font-semibold">Sold out</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold">{selected.name}</h2>
            <p className="text-gray-400 text-sm mt-1">
              {"\u20A6"}{selected.unitPrice.toLocaleString()} each
            </p>

            <label className="block text-gray-400 text-sm mt-5 mb-2">Quantity (max {MAX_QTY})</label>
            <input
              type="number"
              min={1}
              max={MAX_QTY}
              value={qty}
              onChange={(e) => {
                const n = Math.floor(Number(e.target.value));
                setQty(Number.isFinite(n) ? Math.min(MAX_QTY, Math.max(1, n)) : 1);
              }}
              className="w-full bg-[var(--input)] border border-[var(--border)] rounded-xl px-4 py-3 outline-none"
            />

            <div className="flex items-center justify-between mt-5">
              <span className="text-gray-400">Total</span>
              <span className="font-bold text-xl">
                {"\u20A6"}{total.toLocaleString()}
              </span>
            </div>

            {buyError && (
              <p className="text-red-400 text-sm mt-4">
                {buyError}{" "}
                {buyError.toLowerCase().includes("insufficient") && (
                  <Link href="/fund" className="underline text-blue-400">
                    Add funds
                  </Link>
                )}
              </p>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setSelected(null)}
                disabled={buying}
                className="flex-1 bg-[var(--input)] border border-[var(--border)] py-3 rounded-xl font-semibold disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleBuy}
                disabled={buying}
                className="flex-1 bg-blue-600 hover:bg-blue-700 py-3 rounded-xl font-bold disabled:opacity-50"
              >
                {buying ? "Processing..." : "Confirm purchase"}
              </button>
            </div>
          </div>
        </div>
      )}

      <MobileNav />
    </main>
  );
}