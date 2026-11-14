"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import MobileNav from "@/components/MobileNav";
import API from "@/lib/api";
import {
  FaInstagram,
  FaFacebook,
  FaTiktok,
  FaXTwitter,
  FaTelegram,
  FaWhatsapp,
  FaLink,
  FaBagShopping,
} from "react-icons/fa6";

const platformIcons: any = {
  instagram: <FaInstagram className="text-pink-500" />,
  facebook: <FaFacebook className="text-blue-500" />,
  tiktok: <FaTiktok className="text-[var(--foreground)]" />,
  twitter: <FaXTwitter className="text-[var(--foreground)]" />,
  telegram: <FaTelegram className="text-sky-400" />,
  whatsapp: <FaWhatsapp className="text-green-500" />,
  other: <FaLink className="text-gray-400" />,
};

const PLATFORMS = ["", "instagram", "facebook", "tiktok", "twitter", "telegram", "whatsapp"];

type Product = {
  id: number;
  categoryId: number;
  categoryName: string;
  name: string;
  description: string;
  image: string;
  inStock: boolean;
  stock: number;
  unitPrice: number;
};

type Category = { id: number; name: string };

const MAX_QTY = 50;

export default function MarketplacePage() {
  const router = useRouter();

  const [tab, setTab] = useState<"accounts" | "store">("accounts");

  /* ACCOUNTS TAB */
  const [listings, setListings] = useState<any[]>([]);
  const [platform, setPlatform] = useState("");
  const [loading, setLoading] = useState(true);

  /* STORE TAB */
  const [storeAccess, setStoreAccess] = useState<"idle" | "loading" | "open" | "closed" | "login">("idle");
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [storeError, setStoreError] = useState("");

  const [selected, setSelected] = useState<Product | null>(null);
  const [qty, setQty] = useState(1);
  const [buying, setBuying] = useState(false);
  const [buyError, setBuyError] = useState("");

  /* OPEN STORE TAB DIRECTLY FROM /marketplace?tab=store */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("tab") === "store") setTab("store");
  }, []);

  /* LOAD LISTINGS */
  useEffect(() => {
    async function fetchListings() {
      setLoading(true);
      try {
        const query = platform ? `?platform=${platform}` : "";
        const res = await API.get(`/listings${query}`);
        setListings(res.data);
      } catch (error) {
        console.log(error);
      } finally {
        setLoading(false);
      }
    }
    fetchListings();
  }, [platform]);

  /* LOAD STORE (only the first time the store tab is opened) */
  useEffect(() => {
    if (tab !== "store" || storeAccess !== "idle") return;

    async function initStore() {
      setStoreAccess("loading");
      const token = localStorage.getItem("token");
      if (!token) {
        setStoreAccess("login");
        return;
      }
      const headers = { Authorization: `Bearer ${token}` };
      try {
        const acc = await API.get("/store/access", { headers });
        if (!acc.data.open) {
          setStoreAccess("closed");
          return;
        }
        const res = await API.get("/store/catalog", { headers });
        setProducts(res.data.products);
        setCategories(res.data.categories);
        setStoreAccess("open");
      } catch (e: any) {
        if (e.response?.status === 401) {
          setStoreAccess("login");
          return;
        }
        setStoreError(e.response?.data?.message || "Could not load the store. Please try again.");
        setStoreAccess("open");
      }
    }
    initStore();
  }, [tab, storeAccess]);

  const visibleProducts = useMemo(
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

  const total = selected ? selected.unitPrice * qty : 0;
  const maxForSelected = selected ? Math.min(MAX_QTY, selected.stock) : MAX_QTY;

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] pb-28 md:pb-0">
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/20 blur-[120px] rounded-full" />
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-10">

        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 mb-8">
          <div>
            <h1 className="text-2xl md:text-5xl font-bold">Marketplace</h1>
            <p className="text-gray-400 mt-3 text-lg">Buy verified social media accounts and more.</p>
          </div>

          {tab === "accounts" ? (
            <Link href="/my-purchases">
              <button className="flex items-center gap-2 bg-[var(--card)] border border-[var(--border)] hover:border-blue-500 px-5 py-3 rounded-2xl font-semibold transition">
                <FaBagShopping /> My Purchases
              </button>
            </Link>
          ) : (
            <Link href="/marketplace/store/orders">
              <button className="flex items-center gap-2 bg-[var(--card)] border border-[var(--border)] hover:border-blue-500 px-5 py-3 rounded-2xl font-semibold transition">
                <FaBagShopping /> My Store Orders
              </button>
            </Link>
          )}
        </div>

        {/* TABS */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-1.5 flex gap-1.5 mb-8">
          <button
            onClick={() => setTab("accounts")}
            className={`flex-1 py-3 rounded-xl font-semibold transition ${
              tab === "accounts"
                ? "bg-blue-600 text-white shadow-lg"
                : "text-gray-400 hover:text-[var(--foreground)]"
            }`}
          >
            Accounts
          </button>
          <button
            onClick={() => setTab("store")}
            className={`flex-1 py-3 rounded-xl font-semibold transition ${
              tab === "store"
                ? "bg-blue-600 text-white shadow-lg"
                : "text-gray-400 hover:text-[var(--foreground)]"
            }`}
          >
            Instant Store
          </button>
        </div>

        {/* ================= ACCOUNTS TAB ================= */}
        {tab === "accounts" && (
          <>
            <div className="flex gap-3 mb-8 overflow-x-auto pb-2">
              {PLATFORMS.map((p) => (
                <button
                  key={p}
                  onClick={() => setPlatform(p)}
                  className={`px-5 py-2 rounded-2xl font-semibold whitespace-nowrap transition flex items-center gap-2 ${
                    platform === p
                      ? "bg-blue-600 text-white"
                      : "bg-[var(--card)] border border-[var(--border)] text-gray-400"
                  }`}
                >
                  {p !== "" && <span className="text-lg">{platformIcons[p]}</span>}
                  {p === "" ? "All" : p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>

            {loading ? (
              <p className="text-gray-400">Loading listings...</p>
            ) : listings.length === 0 ? (
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-10 text-center">
                <p className="font-bold text-lg">No listings available right now</p>
                <p className="text-gray-400 text-sm mt-1">Check back soon.</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-3 gap-6">
                {listings.map((listing) => (
                  <Link key={listing._id} href={`/marketplace/${listing._id}`}>
                    <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-6 shadow-xl hover:border-blue-500 transition cursor-pointer h-full">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">
                          {platformIcons[listing.platform] || platformIcons.other}
                        </span>
                        <span className="inline-block bg-blue-600/20 text-blue-400 text-xs font-bold px-3 py-1 rounded-full uppercase">
                          {listing.platform}
                        </span>
                      </div>
                      <h3 className="text-xl font-bold mt-4">{listing.title}</h3>
                      <p className="text-gray-400 text-sm mt-2 line-clamp-2">{listing.description}</p>
                      <div className="flex items-center justify-between mt-5">
                        <span className="text-gray-400 text-sm">
                          {listing.followers?.toLocaleString()} followers
                        </span>
                        <span className="text-blue-500 font-bold text-lg">
                          {"\u20A6"}{listing.price?.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}

        {/* ================= STORE TAB ================= */}
        {tab === "store" && (
          <>
            {(storeAccess === "idle" || storeAccess === "loading") && (
              <p className="text-gray-400">Loading store...</p>
            )}

            {storeAccess === "login" && (
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-10 text-center">
                <p className="text-gray-400 mb-5">Please log in to use the store.</p>
                <Link
                  href="/login"
                  className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-bold"
                >
                  Log in
                </Link>
              </div>
            )}

            {storeAccess === "closed" && (
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-10 text-center">
                <h2 className="text-2xl font-bold">Instant Accounts Store</h2>
                <p className="text-gray-400 mt-2">Coming soon.</p>
              </div>
            )}

            {storeAccess === "open" && (
              <>
                <p className="text-gray-400 mb-6">
                  Pay from your wallet. Login details delivered instantly.
                </p>

                {storeError && <p className="text-red-400 mb-6">{storeError}</p>}

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

                {visibleProducts.length === 0 ? (
                  <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-10 text-center">
                    <p className="font-bold text-lg">No items available right now</p>
                    <p className="text-gray-400 text-sm mt-1">Check back soon.</p>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-3 gap-6">
                    {visibleProducts.map((p) => (
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
                              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl font-bold transition"
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
              </>
            )}
          </>
        )}
      </div>

      {/* BUY MODAL */}
      {selected && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold">{selected.name}</h2>
            <p className="text-gray-400 text-sm mt-1">
              {"\u20A6"}{selected.unitPrice.toLocaleString()} each
            </p>

            <label className="block text-gray-400 text-sm mt-5 mb-2">
              Quantity (max {maxForSelected})
            </label>
            <input
              type="number"
              min={1}
              max={maxForSelected}
              value={qty}
              onChange={(e) => {
                const n = Math.floor(Number(e.target.value));
                setQty(Number.isFinite(n) ? Math.min(maxForSelected, Math.max(1, n)) : 1);
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
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold disabled:opacity-50"
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