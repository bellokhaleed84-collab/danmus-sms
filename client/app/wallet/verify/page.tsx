"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import API from "@/lib/api";

function Verify() {
  const params = useSearchParams();
  const [msg, setMsg] = useState("Confirming your payment\u2026");
  const [done, setDone] = useState(false);

  useEffect(() => {
    const ref =
      params.get("reference") ||
      params.get("transaction_ref") ||
      params.get("trxref") ||
      sessionStorage.getItem("squad_ref");
    if (!ref) {
      setMsg("No payment reference found.");
      setDone(true);
      return;
    }
    let tries = 0;
    const run = async () => {
      try {
        const { data } = await API.get(`/squad/verify/${encodeURIComponent(ref)}`);
        if (data.state === "success") {
          sessionStorage.removeItem("squad_ref");
          setMsg(`Payment confirmed. New balance: \u20A6${Number(data.balance).toLocaleString()}`);
          return setDone(true);
        }
        if (data.state === "failed" || data.state === "mismatch" || data.state === "not_found") {
          setMsg("Payment was not successful, so no wallet credit was added.");
          return setDone(true);
        }
        if (++tries < 6) return setTimeout(run, 3000);
        setMsg("Still processing. Your wallet updates automatically once the bank confirms.");
        setDone(true);
      } catch {
        if (++tries < 6) return setTimeout(run, 3000);
        setMsg("Could not confirm yet. Check your wallet in a few minutes.");
        setDone(true);
      }
    };
    run();
  }, [params]);

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="max-w-md text-center space-y-6">
        <p className="text-lg">{msg}</p>
        {done && (
          <Link href="/wallet" className="inline-block bg-blue-600 rounded-2xl px-6 py-3 font-semibold">
            Go to wallet
          </Link>
        )}
      </div>
    </main>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={null}>
      <Verify />
    </Suspense>
  );
}