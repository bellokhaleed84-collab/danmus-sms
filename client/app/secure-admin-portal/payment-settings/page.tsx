"use client";

import { useEffect, useState } from "react";
import API from "@/lib/api";

type ProviderInfo = {
  key: string;
  label: string;
  configured: boolean;
};

type Settings = {
  activeProvider: string;
  depositsEnabled: boolean;
  maintenanceMessage: string;
  updatedBy: string | null;
  updatedAt: string | null;
  providers: ProviderInfo[];
};

function authHeaders() {
  const token = localStorage.getItem("token");
  return { headers: { Authorization: `Bearer ${token}` } };
}

async function fetchSettings(): Promise<Settings> {
  const res = await API.get("/payment-settings/admin", authHeaders());
  return res.data;
}

export default function AdminPaymentSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchSettings();
        setSettings(data);
        setMessage(data.maintenanceMessage || "");
      } catch (error: any) {
        alert(error.response?.data?.message || "Failed to load payment settings");
      }
      setLoading(false);
    }
    load();
  }, []);

  async function update(body: Record<string, unknown>, savingKey: string) {
    setSaving(savingKey);
    try {
      await API.put("/payment-settings/admin", body, authHeaders());
      const data = await fetchSettings();
      setSettings(data);
      setMessage(data.maintenanceMessage || "");
    } catch (error: any) {
      alert(error.response?.data?.message || "Failed to update settings");
    }
    setSaving(null);
  }

  function handleSwitchProvider(provider: ProviderInfo) {
    if (!settings || provider.key === settings.activeProvider) return;
    const ok = window.confirm(
      `Switch wallet funding to ${provider.label}?\n\nAll NEW deposits will use ${provider.label} immediately. Payments already started with the other provider will still be credited.`
    );
    if (!ok) return;
    update({ activeProvider: provider.key }, `provider:${provider.key}`);
  }

  function handleToggleDeposits() {
    if (!settings) return;

    if (settings.depositsEnabled) {
      const text = message.trim();
      if (!text) {
        alert("Write the maintenance message users should see first.");
        return;
      }
      const ok = window.confirm(
        "Pause ALL wallet funding?\n\nUsers will not be able to add money until you resume it."
      );
      if (!ok) return;
      update({ depositsEnabled: false, maintenanceMessage: text }, "toggle");
    } else {
      update({ depositsEnabled: true }, "toggle");
    }
  }

  function handleSaveMessage() {
    const text = message.trim();
    if (!text) {
      alert("The maintenance message cannot be empty.");
      return;
    }
    update({ maintenanceMessage: text }, "message");
  }

  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="w-14 h-14 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
        <h1 className="text-xl font-bold">Loading payment settings...</h1>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="bg-[var(--input)] border border-[var(--border)] rounded-2xl p-8 md:p-10 text-center">
        <h3 className="text-lg md:text-2xl font-bold">Could not load payment settings</h3>
        <p className="text-gray-400 text-sm mt-2">
          Check that the backend is running and that your email is in ADMIN_EMAILS.
        </p>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-2xl md:text-4xl font-bold mb-8">Payment Settings</h1>

      <div className="space-y-8">
        {/* PROVIDER */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl md:rounded-3xl p-5 md:p-8 shadow-xl">
          <h2 className="text-lg md:text-2xl font-bold">Payment Provider</h2>
          <p className="text-gray-400 text-sm mt-2 mb-6">
            Choose which provider users pay with when they fund their wallet. The change applies instantly, with no redeploy.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
            {settings.providers.map((provider) => {
              const active = provider.key === settings.activeProvider;
              const busy = saving === `provider:${provider.key}`;
              return (
                <div
                  key={provider.key}
                  className={`border rounded-2xl p-4 md:p-5 ${
                    active
                      ? "bg-blue-600/10 border-blue-500/50"
                      : "bg-[var(--input)] border-[var(--border)]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-bold text-base md:text-lg">{provider.label}</p>
                    {active && (
                      <span className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-xl text-xs font-semibold">
                        Active
                      </span>
                    )}
                  </div>

                  <p
                    className={`text-xs mt-2 ${
                      provider.configured ? "text-green-500" : "text-red-400"
                    }`}
                  >
                    {provider.configured
                      ? "Keys configured on server"
                      : "Not configured: add the keys on Render first"}
                  </p>

                  <button
                    onClick={() => handleSwitchProvider(provider)}
                    disabled={active || !provider.configured || saving !== null}
                    className="w-full mt-4 py-2.5 rounded-xl text-sm font-semibold transition bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {busy ? "Switching..." : active ? "Currently in use" : `Use ${provider.label}`}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* MAINTENANCE */}
        <div
          className={`border rounded-2xl md:rounded-3xl p-5 md:p-8 shadow-xl ${
            settings.depositsEnabled
              ? "bg-[var(--card)] border-[var(--border)]"
              : "bg-red-500/10 border-red-500/40"
          }`}
        >
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-lg md:text-2xl font-bold">Wallet Funding</h2>
            <span
              className={`px-4 py-2 rounded-xl text-sm font-semibold ${
                settings.depositsEnabled
                  ? "bg-green-500/20 text-green-500"
                  : "bg-red-500/20 text-red-400"
              }`}
            >
              {settings.depositsEnabled ? "Open" : "Paused (maintenance)"}
            </span>
          </div>

          <p className="text-gray-400 text-sm mt-2 mb-6">
            Pausing blocks all new deposits. Payments users already made are still credited to their wallets.
          </p>

          <label className="block text-sm font-semibold mb-2">Message users will see</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, 300))}
            rows={3}
            className="w-full bg-[var(--input)] border border-[var(--border)] rounded-2xl px-4 py-3 outline-none focus:border-blue-500 text-sm"
            placeholder="Sorry, we are under maintenance for now. Please check back soon."
          />
          <p className="text-gray-500 text-xs mt-1 text-right">{message.length}/300</p>

          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <button
              onClick={handleSaveMessage}
              disabled={saving !== null || message.trim() === settings.maintenanceMessage}
              className="flex-1 bg-gray-700 hover:bg-gray-600 py-3 rounded-2xl font-semibold text-sm transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving === "message" ? "Saving..." : "Save message"}
            </button>

            <button
              onClick={handleToggleDeposits}
              disabled={saving !== null}
              className={`flex-1 py-3 rounded-2xl font-semibold text-sm transition disabled:opacity-50 ${
                settings.depositsEnabled
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-green-600 hover:bg-green-700"
              }`}
            >
              {saving === "toggle"
                ? "..."
                : settings.depositsEnabled
                ? "Pause all deposits"
                : "Resume deposits"}
            </button>
          </div>
        </div>

        {settings.updatedBy && (
          <p className="text-gray-500 text-xs">
            Last changed by {settings.updatedBy}
            {settings.updatedAt ? ` on ${new Date(settings.updatedAt).toLocaleString()}` : ""}
          </p>
        )}
      </div>
    </>
  );
}