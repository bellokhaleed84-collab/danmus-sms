"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function PaymentSuccessPage() {

  const searchParams = useSearchParams();

  const router = useRouter();

  const [message, setMessage] = useState("Verifying payment...");

  useEffect(() => {

    async function verifyPayment() {

      try {

        const reference = searchParams.get("reference");

        if (!reference) {

          setMessage("No payment reference found");

          return;
        }

        const token = localStorage.getItem("token");

        const response = await fetch(
          `http://localhost:5000/api/payment/verify/${reference}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

        console.log(data);

        if (response.ok) {

          setMessage("Payment successful");

          setTimeout(() => {

            router.push("/dashboard");

          }, 2000);

        } else {

          setMessage(data.message || "Verification failed");
        }

      } catch (error) {

        console.log(error);

        setMessage("Something went wrong");
      }
    }

    verifyPayment();

  }, [searchParams, router]);

  return (

    <main className="min-h-screen flex items-center justify-center bg-black text-white">

      <div className="bg-zinc-900 p-10 rounded-3xl shadow-2xl text-center">

        <h1 className="text-3xl font-bold mb-4">
          Payment Status
        </h1>

        <p className="text-lg">
          {message}
        </p>

      </div>

    </main>
  );
}