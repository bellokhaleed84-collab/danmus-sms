"use client";

import { useEffect, useState } from "react";
import API from "@/lib/api";

// True only when the logged-in user is allowed to see Number Rental
// (admin, or the admin switch is ON). Stays false on any error, so the
// feature stays hidden until the backend is ready.
export function useNumbersAccess() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    API.get("/numbers/access")
      .then((res) => setOpen(!!res.data?.open))
      .catch(() => setOpen(false));
  }, []);

  return open;
}