"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import MobileNav from "@/components/MobileNav";
import API from "@/lib/api";

export default function NumberInboxPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");

  const load = useCallback(
    async (silent = false) => {
      if (!id) return;
      try {
        const res = await API.get(`/numbers/${id}/messages`);
        setData(res.data);
        setError("");
      } catch (e: any) {
        if (!silent) setError(e.response?.data?.message || "Could not load this number.");
      } finally {
        setLoading(false);
      }
    },
    [id]
  );

  // Load now, then refresh every 5 seconds so new SMS appear on their own.
  useEffect(() => {
    load();
    const t = setInterval(() => load(true), 5000);
    return () => clearInterval(t);
  }, [load]);

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(text);
      setTimeout(() => setCopied(""), 1500);
    } catch (e) {
      console.log(e);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex items-center justify-center">
        <p className="text-gray-400">Loading inbox...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] pb-28 md:pb-0">
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-10">
        <Link href="/numbers/mine">
          <button className="text-gray-400 hover:text-[var(--foreground)] mb-6">{"\u2190"} Back to My Numbers</button>
        </Link>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-2xl p-4 mb-6 text-sm">
            {error}
          </div>
        )}

        {data && (
          <>
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-6 shadow-xl mb-6">
              <p className="text-gray-400 text-sm">Your number</p>
              <p className="text-2xl md:text-3xl font-bold tracking-wide mt-1 break-all">{data.phoneNumber}</p>
              <div className="flex gap-3 mt-4 flex-wrap items-center">
                <button
                  onClick={() => copy(data.phoneNumber)}
                  className="bg-[var(--input)] border border-[var(--border)] px-5 py-2 rounded-xl text-sm font-semibold"
                >
                  {copied === data.phoneNumber ? "Copied!" : "Copy number"}
                </button>
                <button
                  onClick={() => load()}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl text-sm font-bold transition"
                >
                  Refresh
                </button>
                {data.expiresAt && (
                  <span className="text-gray-400 text-sm">
                    Expires {new Date(data.expiresAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>

            <h2 className="text-xl md:text-2xl font-bold mb-4">Messages</h2>

            {data.status === "active" && (
              <div className="bg-yellow-600/10 border border-yellow-600/40 rounded-2xl p-4 mb-5 flex items-center gap-3">
                <div className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin shrink-0" />
                <p className="text-yellow-500 text-sm">Listening for new messages. This page updates automatically.</p>
              </div>
            )}

            {data.messages.length === 0 ? (
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-10 text-center">
                <p className="font-bold text-lg">No messages yet</p>
                <p className="text-gray-400 text-sm mt-1">
                  Use this number on any service. Codes will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {data.messages.map((m: any) => (
                  <div key={m._id} className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-5 shadow-xl">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <p className="text-gray-400 text-sm">From {m.from || "unknown"}</p>
                      <p className="text-gray-500 text-xs">{new Date(m.receivedAt).toLocaleString()}</p>
                    </div>

                    {m.code && (
                      <div className="flex items-center gap-3 mt-3 flex-wrap">
                        <span className="text-3xl font-bold tracking-widest text-green-500">{m.code}</span>
                        <button
                          onClick={() => copy(m.code)}
                          className="bg-green-600/20 border border-green-600 text-green-500 px-4 py-1 rounded-xl text-sm font-semibold"
                        >
                          {copied === m.code ? "Copied!" : "Copy code"}
                        </button>
                      </div>
                    )}

                    <p className="text-sm mt-3 break-words">{m.text}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <MobileNav />
    </main>
  );
}