"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

function VerifyOTPContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const role = searchParams.get("role") || "customer";

  const dashboardPath = (r: string) => {
    if (r === "admin") return "/admin";
    if (r === "organiser") return "/organiser";
    return "/dashboard";
  };

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendTimer, setResendTimer] = useState(30);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (resendTimer > 0) {
      const t = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendTimer]);

  const handleChange = (i: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...otp];
    next[i] = val.slice(-1);
    setOtp(next);
    if (val && i < 5) inputs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[i] && i > 0) inputs.current[i - 1]?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const code = otp.join("");
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: code }),
      });
      if (res.ok) {
        router.push(dashboardPath(role));
      } else {
        const data = await res.json();
        setError(data?.error?.message || "Invalid or expired code.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendTimer(30);
    await fetch("/api/auth/resend-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
  };

  return (
    <div className="min-h-screen bg-[#FFFBE9] flex items-center justify-center px-4 py-12">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, #FFF3C4, transparent)" }} />
      </div>

      <div className="relative w-full max-w-md text-center">
        <div className="bg-white rounded-2xl border border-[#E8E0D0] shadow-[0_8px_40px_rgba(114,74,106,0.10)] p-8">
          <div className="w-16 h-16 rounded-2xl bg-[#F5EDF4] flex items-center justify-center mx-auto mb-5">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#724A6A" strokeWidth="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-[#1A1A2E] mb-2">Check your email</h1>
          <p className="text-sm text-[#4A4A6A] mb-8 leading-relaxed">
            We sent a 6-digit verification code to<br />
            <strong className="text-[#1A1A2E]">{email || "your email"}</strong>
          </p>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-[#FFEBEE] border border-[#C62828]/20 text-sm text-[#C62828] font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="flex gap-2 justify-center mb-6">
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { inputs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  className={`w-11 h-12 text-center text-lg font-bold rounded-xl border-2 bg-[#FFFBE9] outline-none transition-all ${
                    digit
                      ? "border-[#724A6A] bg-[#F5EDF4] text-[#724A6A]"
                      : "border-[#E8E0D0] text-[#1A1A2E] focus:border-[#724A6A]"
                  }`}
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={loading || otp.some((d) => !d)}
              className="btn-primary w-full py-3 rounded-xl disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Verifying..." : "Verify Email"}
            </button>
          </form>

          <div className="mt-5 text-sm text-[#4A4A6A]">
            Didn't receive the code?{" "}
            {resendTimer > 0 ? (
              <span className="text-[#8A8AAA]">Resend in {resendTimer}s</span>
            ) : (
              <button onClick={handleResend} className="text-[#724A6A] font-semibold hover:underline">
                Resend code
              </button>
            )}
          </div>
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

export default function VerifyOTPPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#FFFBE9] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#724A6A] border-t-transparent animate-spin" />
      </div>
    }>
      <VerifyOTPContent />
    </Suspense>
  );
}
