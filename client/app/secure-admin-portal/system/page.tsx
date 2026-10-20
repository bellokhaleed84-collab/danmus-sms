"use client";

import { useEffect, useState } from "react";
import API from "@/lib/api";

function fmt(b: number) {
  if (!b) return "0 B";
  const u = ["B", "KB", "MB", "GB"];
  let i = 0;
  let n = b;
  while (n >= 1024 && i < u.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(i ? 1 : 0)} ${u[i]}`;
}

export default function AdminSystemPage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError("");
    const token = localStorage.getItem("token");
    try {
      const res = await API.get("/admin/system/db-stats", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setData(res.data);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Could not load database stats");
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const pct = data ? Number(data.percentUsed) : 0;
  const barColor = pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-yellow-500" : "bg-green-500";
  const textColor = pct >= 90 ? "text-red-500" : pct >= 70 ? "text-yellow-500" : "text-green-500";

  return (
    <>
      <div className="flex items-center justify-between mb-8 gap-3">
        <h1 className="text-2xl md:text-4xl font-bold">System</h1>
        <button
          onClick={load}
          className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-2xl font-semibold text-sm transition"
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-2xl p-4 mb-6 text-sm">{error}</div>
      )}

      {data && (
        <>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl md:rounded-3xl p-5 md:p-8 shadow-xl mb-6">
            <div className="flex items-end justify-between flex-wrap gap-2 mb-4">
              <div>
                <p className="text-gray-400 text-sm">Database storage used</p>
                <h2 className={`text-3xl md:text-5xl font-bold mt-2 ${textColor}`}>{pct.toFixed(1)}%</h2>
              </div>
              <p className="text-gray-400 text-sm">
                {fmt(data.usedBytes)} of {data.limitMb} MB
              </p>
            </div>
            <div className="w-full h-4 bg-[var(--input)] rounded-full overflow-hidden">
              <div className={`h-full ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
            </div>
            <p className="text-gray-400 text-xs mt-3">
              Estimate based on stored data plus indexes. The Atlas dashboard is the final word on your plan quota.
              Set MONGO_STORAGE_LIMIT_MB on Render if your plan limit is not {data.limitMb} MB.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-8">
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 md:p-6 shadow-xl">
              <p className="text-gray-400 text-xs md:text-sm">Remaining</p>
              <h3 className="text-lg md:text-3xl font-bold mt-2 text-green-500">{fmt(data.remainingBytes)}</h3>
            </div>
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 md:p-6 shadow-xl">
              <p className="text-gray-400 text-xs md:text-sm">Data size</p>
              <h3 className="text-lg md:text-3xl font-bold mt-2">{fmt(data.dataSize)}</h3>
            </div>
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 md:p-6 shadow-xl">
              <p className="text-gray-400 text-xs md:text-sm">Storage size</p>
              <h3 className="text-lg md:text-3xl font-bold mt-2">{fmt(data.storageSize)}</h3>
            </div>
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 md:p-6 shadow-xl">
              <p className="text-gray-400 text-xs md:text-sm">Index size</p>
              <h3 className="text-lg md:text-3xl font-bold mt-2">{fmt(data.indexSize)}</h3>
            </div>
          </div>

          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl md:rounded-3xl p-5 md:p-8 shadow-xl">
            <h2 className="text-lg md:text-2xl font-bold mb-5">Collections (largest first)</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="text-left text-gray-400">
                    <th className="py-2">Collection</th>
                    <th className="py-2">Documents</th>
                    <th className="py-2">Storage</th>
                    <th className="py-2">Indexes</th>
                  </tr>
                </thead>
                <tbody>
                  {data.collections.map((c: any) => (
                    <tr key={c.name} className="border-t border-[var(--border)]">
                      <td className="py-3 font-semibold">{c.name}</td>
                      <td className="py-3">{Number(c.count).toLocaleString()}</td>
                      <td className="py-3">{fmt(c.storageSize)}</td>
                      <td className="py-3">{fmt(c.indexSize)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </>
  );
}