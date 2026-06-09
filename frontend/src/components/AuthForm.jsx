// Shared layout/styles for login + register pages.
import React from "react";
import { Link } from "react-router-dom";

export default function AuthForm({
  title,
  subtitle,
  onSubmit,
  submitting,
  error,
  submitLabel,
  altText,
  altLinkText,
  altLinkTo,
  children,
}) {
  return (
    <div className="min-h-screen w-full font-rounded bg-gradient-to-br from-sky-100 via-emerald-50 to-amber-100 flex items-center justify-center p-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md bg-white/85 backdrop-blur rounded-[2.5rem] shadow-2xl ring-1 ring-white/70 p-8 sm:p-10 flex flex-col gap-4"
      >
        <header className="text-center mb-2">
          <div className="text-5xl mb-2">🎤</div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-sky-700">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-slate-600 mt-1">{subtitle}</p>
          )}
        </header>

        {children}

        {error && (
          <p className="text-sm text-orange-500 font-bold text-center">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="bg-emerald-500 text-white text-lg font-extrabold px-6 py-3 rounded-2xl shadow-lg hover:bg-emerald-600 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {submitting ? "…" : submitLabel}
        </button>

        <p className="text-sm text-center text-slate-600">
          {altText}{" "}
          <Link to={altLinkTo} className="font-bold text-sky-700 hover:underline">
            {altLinkText}
          </Link>
        </p>
      </form>
    </div>
  );
}

export function AuthField({ label, type = "text", value, onChange, ...rest }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-bold uppercase tracking-wider text-sky-700">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-4 py-3 rounded-2xl border-2 border-sky-200 focus:border-sky-400 focus:outline-none text-base bg-white"
        {...rest}
      />
    </label>
  );
}
