"use client";

import { GoogleOAuthProvider } from "@react-oauth/google";
import React from "react";

interface GoogleProviderProps {
  children: React.ReactNode;
}

export default function GoogleProvider({
  children,
}: GoogleProviderProps) {

  return (
    <GoogleOAuthProvider clientId="YOUR_GOOGLE_CLIENT_ID">
      {children}
    </GoogleOAuthProvider>
  );
}