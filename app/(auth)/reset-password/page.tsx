"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Invalid or missing reset token.");
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      return setError("Passwords do not match.");
    }
    if (password.length < 8) {
      return setError("Password must be at least 8 characters.");
    }

    setError("");
    setLoading(true);

    try {
      const { error } = await authClient.resetPassword({
        newPassword: password,
        token: token || "",
      });

      if (!error) {
        setSuccess(true);
        setTimeout(() => router.push("/login"), 3000);
      } else {
        setError(error.message || "Failed to reset password.");
      }
    } catch (err) {
      console.error("[RESET_PASSWORD_CATCH]", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E8E0D0] shadow-[0_8px_40px_rgba(114,74,106,0.10)] p-8">
      {!success ? (
        <>
          <div className="w-16 h-16 rounded-2xl bg-[#F5EDF4] flex items-center justify-center mx-auto mb-5">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#724A6A" strokeWidth="2">
              <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3L15.5 7.5z"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[#1A1A2E] mb-2">Reset Password</h1>
          <p className="text-sm text-[#4A4A6A] mb-8">
            Enter your new password below.
          </p>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-[#FFEBEE] border border-[#C62828]/20 text-sm text-[#C62828] font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-left">
            <div>
              <label className="block text-xs font-semibold text-[#4A4A6A] mb-1.5 ml-1">New Password</label>
              <input
                type="password"
                className="input-base"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#4A4A6A] mb-1.5 ml-1">Confirm New Password</label>
              <input
                type="password"
                className="input-base"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" disabled={loading || (!!error && !token)} className="btn-primary w-full py-3 rounded-xl disabled:opacity-60 mt-2">
              {loading ? "Resetting..." : "Reset Password"}
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
          <h1 className="text-2xl font-bold text-[#1A1A2E] mb-2">Password Reset!</h1>
          <p className="text-sm text-[#4A4A6A] mb-6">
            Your password has been updated successfully. Redirecting you to login...
          </p>
          <Link href="/login" className="btn-primary w-full py-3 rounded-xl text-center block">
            Go to Login
          </Link>
        </>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-[#FFFBE9] flex items-center justify-center px-4 py-12">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, #F5EDF4, transparent)" }} />
      </div>

      <div className="relative w-full max-w-md text-center">
        <Suspense fallback={
          <div className="bg-white rounded-2xl border border-[#E8E0D0] p-8 animate-pulse h-96">
            <div className="w-16 h-16 bg-[#F0EAD8] rounded-2xl mx-auto mb-5" />
            <div className="h-6 bg-[#F0EAD8] rounded w-1/2 mx-auto mb-2" />
            <div className="h-4 bg-[#F0EAD8] rounded w-3/4 mx-auto mb-8" />
          </div>
        }>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
