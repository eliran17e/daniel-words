import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import AuthForm, { AuthField } from "./AuthForm";

export default function RegisterPage() {
  const { register } = useAuth();
  const nav = useNavigate();

  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (password.length < 4) {
      setError("Password must be at least 4 characters");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await register(email, password, displayName);
      nav("/", { replace: true });
    } catch (err) {
      setError(err?.response?.data?.detail || "Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthForm
      title="Create your account"
      subtitle="Get a personal word deck for your kid"
      onSubmit={handleSubmit}
      submitting={submitting}
      error={error}
      submitLabel="Create account"
      altText="Already have an account?"
      altLinkText="Log in"
      altLinkTo="/login"
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
        label="Display name (optional)"
        value={displayName}
        onChange={setDisplayName}
        autoComplete="name"
        placeholder="Daniel's parent"
      />
      <AuthField
        label="Password"
        type="password"
        value={password}
        onChange={setPassword}
        autoComplete="new-password"
        required
        minLength={4}
      />
      <AuthField
        label="Confirm password"
        type="password"
        value={confirm}
        onChange={setConfirm}
        autoComplete="new-password"
        required
      />
    </AuthForm>
  );
}
