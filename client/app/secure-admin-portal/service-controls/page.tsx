"use client";

import { useEffect, useState } from "react";
import API from "@/lib/api";

export default function AdminServiceControlsPage() {
  const [loading, setLoading] = useState(true);
  const [serviceControls, setServiceControls] = useState<any[]>([]);
  const [controlLoading, setControlLoading] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const token = localStorage.getItem("token");
      try {
        const res = await API.get("/admin/service-controls", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setServiceControls(res.data);
      } catch (error) {
        console.log(error);
      }
      setLoading(false);
    }
    load();
  }, []);

  async function handleToggleService(key: string, currentlyLocked: boolean) {
    const token = localStorage.getItem("token");
    setControlLoading(key);
    try {
      const reason = !currentlyLocked
        ? prompt("Reason for locking (optional):") || ""
        : "";
      const res = await API.patch(
        `/admin/service-controls/${encodeURIComponent(key)}`,
        { locked: !currentlyLocked, reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setServiceControls((prev) =>
        prev.map((c) => (c.key === key ? res.data.control : c))
      );
    } catch (error: any) {
      alert(error.response?.data?.message || "Failed to update service");
    }
    setControlLoading(null);
  }

  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="w-14 h-14 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
        <h1 className="text-xl font-bold">Loading service controls...</h1>
      </div>
    );
  }

  const providerControls = serviceControls.filter((c) => c.type === "provider");
  const serviceOnlyControls = serviceControls.filter((c) => c.type === "service");
  const comboControls = serviceControls.filter((c) => c.type === "provider_service");

  function renderTile(control: any) {
    return (
      <div
        key={control.key}
        className={`border rounded-2xl p-4 ${
          control.locked
            ? "bg-red-500/10 border-red-500/40"
            : "bg-[var(--input)] border-[var(--border)]"
        }`}
      >
        <p className="font-semibold text-sm truncate">{control.label}</p>
        <p className="text-gray-500 text-[11px] mt-1 uppercase">{control.type.replace("_", " ")}</p>
        {control.locked && control.reason && (
          <p className="text-red-400 text-[11px] mt-2 truncate">{control.reason}</p>
        )}
        <button
          onClick={() => handleToggleService(control.key, control.locked)}
          disabled={controlLoading === control.key}
          className={`w-full mt-3 py-2 rounded-xl text-xs font-semibold transition ${
            control.locked ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
          }`}
        >
          {controlLoading === control.key ? "..." : control.locked ? "Unlock" : "Lock"}
        </button>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-2xl md:text-4xl font-bold mb-8">Service Controls</h1>

      {serviceControls.length === 0 && (
        <div className="bg-[var(--input)] border border-[var(--border)] rounded-2xl p-8 md:p-10 text-center">
          <h3 className="text-lg md:text-2xl font-bold">No Services Found</h3>
        </div>
      )}

      <div className="space-y-8">
        <div>
          <h3 className="text-sm font-bold text-gray-400 uppercase mb-3">Whole Providers</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {providerControls.map(renderTile)}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-bold text-gray-400 uppercase mb-3">Services (all providers)</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {serviceOnlyControls.map(renderTile)}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-bold text-gray-400 uppercase mb-3">Per-Provider Services</h3>
          {["smspool", "fivesim", "grizzly"].map((providerKey) => {
            const group = comboControls.filter((c) => c.key.startsWith(`${providerKey}:`));
            if (group.length === 0) return null;
            return (
              <div key={providerKey} className="mb-6">
                <p className="text-xs text-gray-500 mb-2">{group[0]?.label.split(" — ")[0]}</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                  {group.map(renderTile)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}