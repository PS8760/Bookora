"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forget-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, redirectTo: "/reset-password" }),
      });

      if (res.ok) {
        setSent(true);
      } else {
        const data = await res.json();
        setError(data?.error?.message || "Failed to send reset link.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFBE9] flex items-center justify-center px-4 py-12">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-0 w-80 h-80 rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, #FFF3C4, transparent)" }} />
      </div>

      <div className="relative w-full max-w-md text-center">
        <div className="bg-white rounded-2xl border border-[#E8E0D0] shadow-[0_8px_40px_rgba(114,74,106,0.10)] p-8">
          {!sent ? (
            <>
              <div className="w-16 h-16 rounded-2xl bg-[#FFF3C4] flex items-center justify-center mx-auto mb-5">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#D4A017" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-[#1A1A2E] mb-2">Forgot password?</h1>
              <p className="text-sm text-[#4A4A6A] mb-8">
                No worries! Enter your email and we'll send you a reset link.
              </p>

              {error && (
                <div className="mb-4 px-4 py-3 rounded-xl bg-[#FFEBEE] border border-[#C62828]/20 text-sm text-[#C62828] font-medium">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <input
                  type="email"
                  className="input-base"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <button type="submit" disabled={loading} className="btn-primary w-full py-3 rounded-xl disabled:opacity-60">
                  {loading ? "Sending..." : "Send Reset Link"}
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="w-16 h-16 rounded-2xl bg-[#E8F5E9] flex items-center justify-center mx-auto mb-5">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2E7D32" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-[#1A1A2E] mb-2">Check your email</h1>
              <p className="text-sm text-[#4A4A6A] mb-6">
                We sent a password reset link to <strong className="text-[#1A1A2E]">{email}</strong>
              </p>
              <Link href="/login" className="btn-primary w-full py-3 rounded-xl text-center block">
                Back to Sign In
              </Link>
            </>
          )}
        </div>

        <p className="text-center text-sm text-[#4A4A6A] mt-6">
          <Link href="/login" className="text-[#724A6A] font-semibold hover:underline">
            ← Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
