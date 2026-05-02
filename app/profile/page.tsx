"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { signOut } from "@/lib/auth-client";

interface ProfileData {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: string;
  timezone: string;
  emailVerified: boolean;
  createdAt: string;
  bio: string;
  avatarUrl: string | null;
}

const TIMEZONES = [
  { value: "Asia/Kolkata",      label: "Asia/Kolkata (IST)" },
  { value: "America/New_York",  label: "America/New_York (EST)" },
  { value: "America/Chicago",   label: "America/Chicago (CST)" },
  { value: "America/Los_Angeles", label: "America/Los_Angeles (PST)" },
  { value: "Europe/London",     label: "Europe/London (GMT)" },
  { value: "Europe/Paris",      label: "Europe/Paris (CET)" },
  { value: "Asia/Tokyo",        label: "Asia/Tokyo (JST)" },
  { value: "Asia/Singapore",    label: "Asia/Singapore (SGT)" },
  { value: "Australia/Sydney",  label: "Australia/Sydney (AEDT)" },
  { value: "UTC",               label: "UTC" },
];

const ROLE_LABELS: Record<string, { label: string; bg: string; color: string }> = {
  admin:     { label: "Admin",     bg: "#FFF3E0", color: "#E65100" },
  organiser: { label: "Organiser", bg: "#E8F5E9", color: "#2E7D32" },
  customer:  { label: "Customer",  bg: "#F5EDF4", color: "#724A6A" },
};

function Skeleton({ className }: { className?: string }) {
  return <div className={`skeleton rounded-xl ${className}`} />;
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state — synced from profile once loaded
  const [form, setForm] = useState({ name: "", timezone: "UTC", bio: "" });
  const [formHydrated, setFormHydrated] = useState(false);

  // Password form state
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSaved, setPwSaved] = useState(false);

  // Delete account state
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loadProfile = useCallback((hydrateForm = false) => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((j) => {
        if (j.data) {
          setProfile(j.data);
          if (hydrateForm || !formHydrated) {
            setForm({
              name: j.data.name ?? "",
              timezone: j.data.timezone ?? "UTC",
              bio: j.data.bio ?? "",
            });
            setFormHydrated(true);
          }
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [formHydrated]);

  useEffect(() => {
    loadProfile(true);
    const interval = window.setInterval(() => loadProfile(false), 10000);
    return () => window.clearInterval(interval);
  }, [loadProfile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const j = await res.json();
      if (!res.ok) {
        setError(j.error?.message ?? "Failed to save changes.");
      } else {
        setProfile((prev) => prev ? { ...prev, ...j.data, bio: form.bio } : prev);
        setFormHydrated(true);
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null);
    if (pwForm.next !== pwForm.confirm) {
      setPwError("New passwords do not match.");
      return;
    }
    if (pwForm.next.length < 8) {
      setPwError("Password must be at least 8 characters.");
      return;
    }
    setPwSaving(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.next }),
      });
      if (!res.ok) {
        const j = await res.json();
        setPwError(j.error?.message ?? "Failed to update password.");
      } else {
        setPwSaved(true);
        setPwForm({ current: "", next: "", confirm: "" });
        setTimeout(() => setPwSaved(false), 2500);
      }
    } catch {
      setPwError("Network error. Please try again.");
    } finally {
      setPwSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm("Are you sure you want to delete your account? This action cannot be undone.")) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch("/api/profile", { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json();
        setDeleteError(j.error?.message ?? "Failed to delete account.");
        return;
      }
      // Account deleted — sign out via better-auth client, then redirect
      await signOut();
      router.push("/");
    } catch {
      setDeleteError("Network error. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  const roleInfo = ROLE_LABELS[profile?.role ?? "customer"] ?? ROLE_LABELS.customer;
  const initials = profile?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() ?? "?";

  const avatarSrc = profile?.image ?? profile?.avatarUrl ?? null;

  return (
    <DashboardLayout>
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold text-[#1A1A2E] mb-6">Profile Settings</h1>

        {/* Avatar / identity card */}
        <div className="bg-white rounded-2xl border border-[#E8E0D0] p-6 mb-5 shadow-[0_2px_12px_rgba(114,74,106,0.06)]">
          <div className="flex items-center gap-5">
            <div className="relative flex-shrink-0">
              {loading ? (
                <Skeleton className="w-20 h-20 rounded-2xl" />
              ) : avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt={profile?.name}
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-[#E8E0D0]"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-[#724A6A] flex items-center justify-center text-white text-2xl font-bold shadow-[0_4px_16px_rgba(114,74,106,0.3)]">
                  {initials}
                </div>
              )}
            </div>
            <div className="min-w-0">
              {loading ? (
                <>
                  <Skeleton className="h-5 w-40 mb-2" />
                  <Skeleton className="h-4 w-52 mb-2" />
                  <Skeleton className="h-5 w-20" />
                </>
              ) : (
                <>
                  <h2 className="font-bold text-[#1A1A2E] text-lg truncate">{profile?.name}</h2>
                  <p className="text-sm text-[#8A8AAA] truncate">{profile?.email}</p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span
                      className="badge text-[10px] border"
                      style={{ background: roleInfo.bg, color: roleInfo.color, borderColor: roleInfo.color + "44" }}
                    >
                      {roleInfo.label}
                    </span>
                    {profile?.emailVerified && (
                      <span className="badge bg-[#E8F5E9] text-[#2E7D32] border border-[#A5D6A7] text-[10px]">
                        ✓ Verified
                      </span>
                    )}
                    <span className="text-[10px] text-[#8A8AAA]">
                      Joined {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" }) : ""}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Personal info form */}
        <div className="bg-white rounded-2xl border border-[#E8E0D0] p-6 shadow-[0_2px_12px_rgba(114,74,106,0.06)]">
          <h3 className="font-semibold text-[#1A1A2E] mb-5 pb-3 border-b border-[#E8E0D0]">Personal Information</h3>
          {loading ? (
            <div className="flex flex-col gap-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-32" />
            </div>
          ) : (
            <form onSubmit={handleSave} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-[#1A1A2E] mb-1.5">Full Name</label>
                  <input
                    className="input-base"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#1A1A2E] mb-1.5">Email Address</label>
                  <input
                    type="email"
                    className="input-base bg-[#F9F7F4] cursor-not-allowed"
                    value={profile?.email ?? ""}
                    readOnly
                    title="Email cannot be changed here"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#1A1A2E] mb-1.5">Timezone</label>
                <select
                  className="input-base cursor-pointer"
                  value={form.timezone}
                  onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz.value} value={tz.value}>{tz.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#1A1A2E] mb-1.5">
                  Bio <span className="text-[#8A8AAA] font-normal">(optional)</span>
                </label>
                <textarea
                  className="input-base resize-none"
                  rows={3}
                  placeholder="Tell others a bit about yourself…"
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                />
              </div>

              {error && (
                <p className="text-sm text-[#C62828] bg-[#FFEBEE] px-3 py-2 rounded-lg">{error}</p>
              )}

              <div className="flex items-center gap-3 pt-1">
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary py-2.5 px-6 rounded-xl disabled:opacity-60"
                >
                  {saving ? "Saving…" : "Save Changes"}
                </button>
                {saved && (
                  <span className="flex items-center gap-1.5 text-sm text-[#2E7D32] font-medium">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Saved!
                  </span>
                )}
              </div>
            </form>
          )}
        </div>

        {/* Change password */}
        <div className="bg-white rounded-2xl border border-[#E8E0D0] p-6 mt-5 shadow-[0_2px_12px_rgba(114,74,106,0.06)]">
          <h3 className="font-semibold text-[#1A1A2E] mb-5 pb-3 border-b border-[#E8E0D0]">Change Password</h3>
          <form onSubmit={handlePasswordUpdate} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-semibold text-[#1A1A2E] mb-1.5">Current Password</label>
              <input
                type="password"
                className="input-base"
                placeholder="••••••••"
                value={pwForm.current}
                onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#1A1A2E] mb-1.5">New Password</label>
              <input
                type="password"
                className="input-base"
                placeholder="Min. 8 characters"
                value={pwForm.next}
                onChange={(e) => setPwForm({ ...pwForm, next: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#1A1A2E] mb-1.5">Confirm New Password</label>
              <input
                type="password"
                className="input-base"
                placeholder="••••••••"
                value={pwForm.confirm}
                onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })}
                required
              />
            </div>

            {pwError && (
              <p className="text-sm text-[#C62828] bg-[#FFEBEE] px-3 py-2 rounded-lg">{pwError}</p>
            )}

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={pwSaving}
                className="btn-outline py-2.5 px-6 rounded-xl self-start disabled:opacity-60"
              >
                {pwSaving ? "Updating…" : "Update Password"}
              </button>
              {pwSaved && (
                <span className="flex items-center gap-1.5 text-sm text-[#2E7D32] font-medium">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Password updated!
                </span>
              )}
            </div>
          </form>
        </div>

        {/* Danger zone */}
        <div className="bg-white rounded-2xl border border-[#FFCDD2] p-6 mt-5">
          <h3 className="font-semibold text-[#C62828] mb-2">Danger Zone</h3>
          <p className="text-sm text-[#4A4A6A] mb-4">Once you delete your account, there is no going back.</p>
          {deleteError && (
            <p className="text-sm text-[#C62828] bg-[#FFEBEE] px-3 py-2 rounded-lg mb-3">{deleteError}</p>
          )}
          <button
            onClick={handleDeleteAccount}
            disabled={deleting}
            className="text-sm font-semibold text-[#C62828] border border-[#FFCDD2] px-4 py-2 rounded-xl hover:bg-[#FFEBEE] transition-colors disabled:opacity-60"
          >
            {deleting ? "Deleting…" : "Delete Account"}
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
