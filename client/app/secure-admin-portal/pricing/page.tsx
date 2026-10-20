"use client";

import { useEffect, useState } from "react";
import API from "@/lib/api";

type Setting = {
  key: string;
  label: string;
  enabled: boolean;
  markupPercent: number;
  source: string;
  minMarkup: number;
  maxMarkup: number;
};

function examplePrice(cost: number, pct: number) {
  return Math.ceil((cost * (100 + pct)) / 100 - 1e-9);
}

export default function AdminPricingPage() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [draft, setDraft] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  function auth() {
    const token = localStorage.getItem("token");
    return { headers: { Authorization: `Bearer ${token}` } };
  }

  async function load() {
    setError("");
    try {
      const res = await API.get("/admin/settings", auth());
      setSettings(res.data.settings || []);
      setDraft({});
    } catch (e: any) {
      setError(e?.response?.data?.message || "Could not load settings");
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function save(key: string, body: any, confirmText: string) {
    if (!window.confirm(confirmText)) return;
    setBusy(key);
    try {
      const res = await API.patch(`/admin/settings/${key}`, body, auth());
      const updated = res.data.setting;
      setSettings((prev) => prev.map((s) => (s.key === key ? { ...s, ...updated } : s)));
      setDraft((prev) => {
        const n = { ...prev };
        delete n[key];
        return n;
      });
    } catch (e: any) {
      window.alert(e?.response?.data?.message || "Could not save");
    }
    setBusy("");
  }

  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="w-14 h-14 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
        <h1 className="text-xl font-bold">Loading...</h1>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-2xl md:text-4xl font-bold mb-3">Pricing & Access</h1>
      <p className="text-gray-400 text-sm mb-8">
        Switch a feature on for all users, and set its markup. Each feature has its own markup. Changes apply within
        about 10 seconds and only affect new orders.
      </p>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-2xl p-4 mb-6 text-sm">{error}</div>
      )}

      <div className="grid md:grid-cols-2 gap-5 md:gap-8">
        {settings.map((s) => {
          const pct = draft[s.key] !== undefined ? draft[s.key] : s.markupPercent;
          const changed = pct !== s.markupPercent;
          const isBusy = busy === s.key;

          function bump(delta: number) {
            const next = Math.min(s.maxMarkup, Math.max(s.minMarkup, Math.round((pct + delta) * 100) / 100));
            setDraft((prev) => ({ ...prev, [s.key]: next }));
          }

          return (
            <div
              key={s.key}
              className="bg-[var(--card)] border border-[var(--border)] rounded-2xl md:rounded-3xl p-5 md:p-8 shadow-xl"
            >
              <div className="flex items-start justify-between gap-3 mb-6">
                <div>
                  <h2 className="text-xl md:text-2xl font-bold">{s.label}</h2>
                  <p className="text-gray-500 text-xs mt-1">
                    {s.source === "database" ? "Controlled from this page" : "Using default settings (not saved yet)"}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap ${
                    s.enabled ? "bg-green-500/20 text-green-500" : "bg-yellow-500/20 text-yellow-500"
                  }`}
                >
                  {s.enabled ? "Live for all users" : "Admins only"}
                </span>
              </div>

              <button
                onClick={() =>
                  save(
                    s.key,
                    { enabled: !s.enabled },
                    s.enabled
                      ? `Switch ${s.label} OFF? Only admins will be able to use it.`
                      : `Switch ${s.label} ON for ALL users? They will be able to spend real money from their wallets.`
                  )
                }
                disabled={isBusy}
                className={`w-full py-3 rounded-2xl font-bold transition disabled:opacity-50 ${
                  s.enabled ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"
                }`}
              >
                {isBusy ? "..." : s.enabled ? "Turn OFF (admins only)" : "Turn ON for all users"}
              </button>

              <div className="mt-8">
                <p className="text-gray-400 text-sm mb-3">Markup on supplier price</p>
                <div className="flex items-center justify-center gap-2 md:gap-3">
                  <button onClick={() => bump(-5)} className="bg-[var(--input)] border border-[var(--border)] px-3 py-2 rounded-xl font-semibold text-sm">
                    -5
                  </button>
                  <button onClick={() => bump(-1)} className="bg-[var(--input)] border border-[var(--border)] px-3 py-2 rounded-xl font-semibold text-sm">
                    -1
                  </button>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={pct}
                      min={s.minMarkup}
                      max={s.maxMarkup}
                      onChange={(e) => {
                        const n = Number(e.target.value);
                        if (Number.isFinite(n)) {
                          setDraft((prev) => ({
                            ...prev,
                            [s.key]: Math.min(s.maxMarkup, Math.max(s.minMarkup, n)),
                          }));
                        }
                      }}
                      className="w-20 text-center text-2xl font-bold bg-[var(--input)] border border-[var(--border)] rounded-xl py-2 outline-none"
                    />
                    <span className="text-2xl font-bold">%</span>
                  </div>
                  <button onClick={() => bump(1)} className="bg-[var(--input)] border border-[var(--border)] px-3 py-2 rounded-xl font-semibold text-sm">
                    +1
                  </button>
                  <button onClick={() => bump(5)} className="bg-[var(--input)] border border-[var(--border)] px-3 py-2 rounded-xl font-semibold text-sm">
                    +5
                  </button>
                </div>

                <p className="text-gray-400 text-xs text-center mt-3">
                  Example: supplier cost {"\u20A6"}1,000 sells for {"\u20A6"}{examplePrice(1000, pct).toLocaleString()}
                </p>

                <button
                  onClick={() =>
                    save(
                      s.key,
                      { markupPercent: pct },
                      `Set ${s.label} markup to ${pct}%? New orders will use this price.`
                    )
                  }
                  disabled={!changed || isBusy}
                  className="w-full mt-5 bg-blue-600 hover:bg-blue-700 py-3 rounded-2xl font-bold transition disabled:opacity-40"
                >
                  {isBusy ? "Saving..." : changed ? `Save ${pct}%` : "No changes"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}