"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function GoogleSuccessPage() {
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const name = params.get("name");
    const email = params.get("email");
    const id = params.get("id");

    if (!token) {
      router.push("/login?error=google_failed");
      return;
    }

    // Save to localStorage just like normal login
    localStorage.setItem("token", token);
    localStorage.setItem(
      "user",
      JSON.stringify({ id, name, email })
    );

    router.push("/dashboard");
  }, [router]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-[var(--background)] text-[var(--foreground)]">
      <p className="text-gray-400 text-lg">Signing you in with Google...</p>
    </main>
  );
}