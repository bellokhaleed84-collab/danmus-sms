"use client";

import { GoogleLogin, CredentialResponse } from "@react-oauth/google";
import axios from "axios";

export default function GoogleLoginButton() {

  const handleSuccess = async (
    credentialResponse: CredentialResponse
  ) => {

    try {

      const response = await axios.post(
  `${process.env.NEXT_PUBLIC_API_URL}/api/auth/google-login`,
  {
    token: credentialResponse.credential,
  }
);

      console.log(response.data);

      localStorage.setItem("token", response.data.token);

      alert("Login Successful");

    } catch (error) {

      console.log(error);

      alert("Google Login Failed");

    }
  };

  return (
    <div>
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={() => {
          console.log("Google Login Failed");
        }}
      />
    </div>
  );
}