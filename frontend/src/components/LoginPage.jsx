import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import AuthForm, { AuthField } from "./AuthForm";
import GoogleAuthButton from "./GoogleAuthButton";

export default function LoginPage() {
  const { login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const from = loc.state?.from || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await login(email, password);
      nav(from, { replace: true });
    } catch (err) {
      setError(err?.response?.data?.detail || "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthForm
      title="Welcome back"
      subtitle="Log in to Daniel Words"
      onSubmit={handleSubmit}
      submitting={submitting}
      error={error}
      submitLabel="Log in"
      altText="Don't have an account?"
      altLinkText="Sign up"
      altLinkTo="/register"
    >
      <AuthField
        label="Email"
        type="email"
        value={email}
        onChange={setEmail}
        autoComplete="email"
        required
      />
      <AuthField
        label="Password"
        type="password"
        value={password}
        onChange={setPassword}
        autoComplete="current-password"
        required
      />
      <GoogleAuthButton onError={setError} />
    </AuthForm>
  );
}
