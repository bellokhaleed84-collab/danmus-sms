"use client";


import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import Link from "next/link";

import { supabase } from "@/lib/supabase";

export default function AdminPage() {

  const router = useRouter();

  const [loading, setLoading] = useState(true);

  const [users, setUsers] = useState<any[]>([]);

  const [adminEmail, setAdminEmail] =
    useState("");

  useEffect(() => {

    async function loadAdmin() {

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {

        router.push("/login");

        return;
      }

      /* CURRENT USER EMAIL */
      const currentEmail =
        user.email?.toLowerCase().trim() || "";

      setAdminEmail(currentEmail);

      /* ALLOWED ADMINS */
      const allowedAdmins = [
        "bellokhaleed50@gmail.com",
        "kaybee123@gmail.com",
      ];

      /* BLOCK NON ADMINS */
      if (
        !allowedAdmins.includes(currentEmail)
      ) {

        router.push("/dashboard");

        return;
      }

      /* FETCH USERS */
      const { data, error } =
        await supabase
          .from("profiles")
          .select("*")
          .order("created_at", {
            ascending: false,
          });

      if (error) {

        console.log(error);
      }

      if (data) {

        setUsers(data);
      }

      setLoading(false);
    }

    loadAdmin();

  }, [router]);

  /* LOADING SCREEN */
  if (loading) {

    return (

      <main className="min-h-screen bg-black text-white flex items-center justify-center">

        <div className="text-center">

          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />

          <h1 className="text-2xl md:text-3xl font-bold">
            Loading Admin Panel...
          </h1>

        </div>

      </main>
    );
  }

  return (

    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] transition-all duration-300">

      {/* BACKGROUND EFFECTS */}
      <div className="fixed inset-0 -z-10 overflow-hidden">

        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/20 blur-[120px] rounded-full" />

        <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/20 blur-[120px] rounded-full" />

      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-10">

        {/* TOP HEADER */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 mb-10">

          <div>

            <h1 className="text-2xl md:text-3xl md:text-5xl font-bold">
              Admin Dashboard
            </h1>

            <p className="text-gray-400 mt-3 text-lg">
              Manage your Danmus SMS platform
            </p>

          </div>

          <div className="flex gap-4">

            <Link href="/dashboard">

              <button
                title="Back Dashboard"
                className="bg-blue-600 hover:bg-blue-700 px-4 md:px-6 py-3 rounded-2xl font-semibold transition shadow-xl"
              >
                User Dashboard
              </button>

            </Link>

            <button
              title="Logout"
              onClick={async () => {

                await supabase.auth.signOut();

                router.push("/login");
              }}
              className="bg-red-600 hover:bg-red-700 px-4 md:px-6 py-3 rounded-2xl font-semibold transition shadow-xl"
            >
              Logout
            </button>

          </div>

        </div>

        {/* ADMIN INFO */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl md:rounded-3xl p-5 md:p-8 shadow-2xl mb-10">

          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Admin Access
          </h2>

          <p className="text-gray-400 text-lg">
            Logged in as:
          </p>

          <p className="text-blue-500 font-bold text-2xl mt-2">
            {adminEmail}
          </p>

        </div>

        {/* STATS */}
        <div className="grid md:grid-cols-4 gap-6 mb-10">

          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl md:rounded-3xl p-5 md:p-8 shadow-xl">

            <p className="text-gray-400">
              Total Users
            </p>

            <h2 className="text-2xl md:text-3xl md:text-5xl font-bold mt-4">
              {users.length}
            </h2>

          </div>

          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl md:rounded-3xl p-5 md:p-8 shadow-xl">

            <p className="text-gray-400">
              Wallet Users
            </p>

            <h2 className="text-2xl md:text-3xl md:text-5xl font-bold mt-4 text-green-500">
              {users.length}
            </h2>

          </div>

          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl md:rounded-3xl p-5 md:p-8 shadow-xl">

            <p className="text-gray-400">
              Platform Status
            </p>

            <h2 className="text-2xl md:text-3xl md:text-5xl font-bold mt-4 text-blue-500">
              LIVE
            </h2>

          </div>

          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl md:rounded-3xl p-5 md:p-8 shadow-xl">

            <p className="text-gray-400">
              OTP Orders
            </p>

            <h2 className="text-2xl md:text-3xl md:text-5xl font-bold mt-4 text-yellow-500">
              0
            </h2>

          </div>

        </div>

        {/* USERS SECTION */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl md:rounded-3xl p-5 md:p-8 shadow-2xl">

          <div className="flex items-center justify-between mb-8">

            <h2 className="text-2xl md:text-3xl font-bold">
              Registered Users
            </h2>

            <div className="bg-blue-600 px-5 py-2 rounded-2xl font-semibold">

              {users.length} Users

            </div>

          </div>

          {/* EMPTY */}
          {users.length === 0 && (

            <div className="bg-[var(--input)] border border-[var(--border)] rounded-2xl p-10 text-center">

              <h3 className="text-2xl font-bold">
                No Users Found
              </h3>

            </div>

          )}

          {/* USERS */}
          <div className="space-y-5">

            {users.map((user) => (

              <div
                key={user.id}
                className="bg-[var(--input)] border border-[var(--border)] rounded-2xl md:rounded-3xl p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-6"
              >

                <div>

                  <h3 className="text-2xl font-bold">

                    {user.username || "No Username"}

                  </h3>

                  <p className="text-gray-400 mt-2">

                    {user.email}

                  </p>

                  <p className="text-sm text-gray-500 mt-2">

                    ID:
                    {" "}
                    {user.id}

                  </p>

                </div>

                <div className="flex flex-col md:items-end gap-3">

                  <div className="bg-green-500/20 text-green-500 px-4 py-2 rounded-2xl text-sm font-semibold">

                    Active User

                  </div>

                  <p className="text-gray-400 text-sm">

                    Joined:
                    {" "}

                    {new Date(
                      user.created_at
                    ).toLocaleDateString()}

                  </p>

                </div>

              </div>

            ))}

          </div>

        </div>

      </div>

    </main>
  );
}