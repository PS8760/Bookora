"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn, signUp } from "@/lib/auth-client";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ fullName: "", email: "", password: "", role: "customer" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error: signUpError } = await signUp.email({
        name: form.fullName,
        email: form.email,
        password: form.password,
        callbackURL: "/dashboard",
      });

      if (signUpError) {
        setError(signUpError.message || "Registration failed. Please try again.");
      } else {
        // Set the chosen role server-side (role field is not user-settable via auth)
        if (form.role === "organiser") {
          await fetch("/api/auth/set-role", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ role: "organiser" }),
          });
          router.push("/organiser");
        } else {
          router.push("/dashboard");
        }
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = (p: string) => {
    if (!p) return 0;
    let s = 0;
    if (p.length >= 8) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/[0-9]/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  };
  const strength = passwordStrength(form.password);
  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"][strength];
  const strengthColor = ["", "#C62828", "#E65100", "#D4A017", "#2E7D32"][strength];

  return (
    <div className="min-h-screen bg-[#FFFBE9] flex items-center justify-center px-4 py-12">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, #FFF3C4, transparent)" }} />
        <div className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, #F5EDF4, transparent)" }} />
      </div>

      <div className="relative w-full max-w-md">
        {/* Page heading */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[#1A1A2E] mb-1">Create your account</h1>
          <p className="text-sm text-[#4A4A6A]">Start booking in seconds — it's free</p>
        </div>

        <div className="bg-white rounded-2xl border border-[#E8E0D0] shadow-[0_8px_40px_rgba(114,74,106,0.10)] p-8">
          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-[#FFEBEE] border border-[#C62828]/20 text-sm text-[#C62828] font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Role selector */}
            <div>
              <label className="block text-sm font-semibold text-[#1A1A2E] mb-2">I am a</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "customer", label: "Customer", icon: "👤", desc: "Book appointments" },
                  { value: "organiser", label: "Organiser", icon: "🏢", desc: "Manage services" },
                ].map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setForm({ ...form, role: r.value })}
                    className={`flex flex-col items-center p-3 rounded-xl border-2 transition-all text-center ${
                      form.role === r.value
                        ? "border-[#724A6A] bg-[#F5EDF4]"
                        : "border-[#E8E0D0] bg-[#FFFBE9] hover:border-[#D4B8CF]"
                    }`}
                  >
                    <span className="text-xl mb-1">{r.icon}</span>
                    <span className="text-sm font-semibold text-[#1A1A2E]">{r.label}</span>
                    <span className="text-xs text-[#8A8AAA]">{r.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-sm font-semibold text-[#1A1A2E] mb-1.5">Full Name</label>
              <input
                type="text"
                className="input-base"
                placeholder="Your full name"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                required
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-[#1A1A2E] mb-1.5">Email address</label>
              <input
                type="email"
                className="input-base"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-[#1A1A2E] mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  className="input-base pr-10"
                  placeholder="Min. 8 characters"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8A8AAA] hover:text-[#724A6A] transition-colors"
                >
                  {showPass ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
              {/* Strength bar */}
              {form.password && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="flex-1 h-1 rounded-full transition-all"
                        style={{ background: i <= strength ? strengthColor : "#E8E0D0" }}
                      />
                    ))}
                  </div>
                  <p className="text-xs font-medium" style={{ color: strengthColor }}>{strengthLabel}</p>
                </div>
              )}
            </div>

            {/* Terms */}
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input type="checkbox" required className="mt-0.5 accent-[#724A6A]" />
              <span className="text-xs text-[#4A4A6A] leading-relaxed">
                I agree to the{" "}
                <Link href="/terms" className="text-[#724A6A] hover:underline font-medium">Terms of Service</Link>
                {" "}and{" "}
                <Link href="/privacy" className="text-[#724A6A] hover:underline font-medium">Privacy Policy</Link>
              </span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 rounded-xl disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                  </svg>
                  Creating account...
                </span>
              ) : "Create Account"}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-[#E8E0D0]" />
            <span className="text-xs text-[#8A8AAA] font-medium">or</span>
            <div className="flex-1 h-px bg-[#E8E0D0]" />
          </div>

          {/* Google OAuth */}
          <button
            type="button"
            onClick={() => signIn.social({ provider: "google", callbackURL: "/api/auth/redirect" })}
            className="flex items-center justify-center gap-3 w-full py-2.5 px-4 rounded-xl border border-[#E8E0D0] bg-[#FFFBE9] text-sm font-medium text-[#4A4A6A] hover:border-[#724A6A] hover:text-[#724A6A] transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Sign up with Google
          </button>
        </div>

        <p className="text-center text-sm text-[#4A4A6A] mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-[#724A6A] font-semibold hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
