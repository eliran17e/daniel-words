import React from "react";
import { GoogleLogin } from "@react-oauth/google";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../AuthContext";

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || "";

export default function GoogleAuthButton({ onError }) {
  const { loginWithGoogle } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const from = loc.state?.from || "/";

  // If no client ID was configured at build time, don't render the button at all.
  if (!GOOGLE_CLIENT_ID) return null;

  return (
    <>
      <div className="flex items-center gap-3 my-1">
        <div className="flex-1 h-px bg-slate-200" />
        <span className="text-xs text-slate-400">or</span>
        <div className="flex-1 h-px bg-slate-200" />
      </div>
      <div className="flex justify-center">
        <GoogleLogin
          onSuccess={async (cred) => {
            try {
              await loginWithGoogle(cred.credential);
              nav(from, { replace: true });
            } catch (err) {
              if (onError) onError(err?.response?.data?.detail || "Google sign-in failed");
            }
          }}
          onError={() => onError && onError("Google sign-in failed")}
          theme="outline"
          size="large"
          width="280"
        />
      </div>
    </>
  );
}
