"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import AdminLayout from "@/components/admin/AdminLayout";

interface Service {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  icon: string | null;
  durationMinutes: number;
  type: "USER_BASED" | "RESOURCE_BASED";
  isPublished: boolean;
  advancePayment: boolean;
  paymentAmount: string | null;
  currency: string;
  manualConfirm: boolean;
  assignmentMode: "AUTOMATIC" | "MANUAL";
  maxPerSlot: number;
  venue: string | null;
}

export default function AdminServiceEditPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    icon: "",
    durationMinutes: "30",
    type: "USER_BASED",
    advancePayment: false,
    paymentAmount: "",
    currency: "INR",
    manualConfirm: false,
    assignmentMode: "AUTOMATIC",
    maxPerSlot: "1",
    venue: "",
    isPublished: false,
  });

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    fetch(`/api/appointments/${id}`)
      .then((r) => r.json())
      .then((j) => {
        if (!j?.data) {
          setError(j?.error?.message ?? "Failed to load service.");
          return;
        }
        const s: Service = j.data;
        setForm({
          title: s.title ?? "",
          description: s.description ?? "",
          category: s.category ?? "",
          icon: s.icon ?? "",
          durationMinutes: String(s.durationMinutes ?? 30),
          type: s.type ?? "USER_BASED",
          advancePayment: Boolean(s.advancePayment),
          paymentAmount: s.paymentAmount ?? "",
          currency: s.currency ?? "INR",
          manualConfirm: Boolean(s.manualConfirm),
          assignmentMode: s.assignmentMode ?? "AUTOMATIC",
          maxPerSlot: String(s.maxPerSlot ?? 1),
          venue: s.venue ?? "",
          isPublished: Boolean(s.isPublished),
        });
      })
      .catch(() => setError("Failed to load service."))
      .finally(() => setLoading(false));
  }, [id]);

  const save = async () => {
    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim() || null,
          category: form.category.trim() || null,
          icon: form.icon.trim() || null,
          durationMinutes: Number(form.durationMinutes || "30"),
          type: form.type,
          advancePayment: form.advancePayment,
          paymentAmount: form.advancePayment ? Number(form.paymentAmount || "0") : null,
          currency: form.currency,
          manualConfirm: form.manualConfirm,
          assignmentMode: form.assignmentMode,
          maxPerSlot: Number(form.maxPerSlot || "1"),
          venue: form.venue.trim() || null,
        }),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok) {
        setError(j?.error?.message ?? "Failed to save service.");
        return;
      }
      router.push("/admin/services");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/appointments/${id}/publish`, {
        method: form.isPublished ? "DELETE" : "POST",
      });
      const j = await res.json().catch(() => null);
      if (!res.ok) {
        setError(j?.error?.message ?? "Unable to update publish status.");
        return;
      }
      setForm((prev) => ({ ...prev, isPublished: !prev.isPublished }));
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const copyShare = async () => {
    setSharing(true);
    setError(null);
    try {
      const res = await fetch(`/api/appointments/${id}/share-link`);
      const j = await res.json().catch(() => null);
      if (!res.ok) {
        setError(j?.error?.message ?? "Unable to generate share link.");
        return;
      }
      const shareUrl = j?.data?.shareUrl;
      if (!shareUrl) {
        setError("Unable to generate share link.");
        return;
      }
      await navigator.clipboard.writeText(shareUrl);
      alert("Share URL copied.");
    } catch {
      setError("Network error while generating share link.");
    } finally {
      setSharing(false);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-[#1A1A2E]">Admin Service Editor</h1>
          <Link href="/admin/services" className="btn-outline text-sm py-2 px-4">
            Back to Services
          </Link>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl border border-[#E8E0D0] p-6">Loading service...</div>
        ) : (
          <div className="bg-white rounded-2xl border border-[#E8E0D0] p-6 shadow-[0_2px_12px_rgba(114,74,106,0.06)]">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-[#1A1A2E] mb-1.5">Title *</label>
                <input className="input-base" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#1A1A2E] mb-1.5">Category</label>
                <input className="input-base" value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#1A1A2E] mb-1.5">Icon</label>
                <input className="input-base" value={form.icon} onChange={(e) => setForm((p) => ({ ...p, icon: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#1A1A2E] mb-1.5">Venue</label>
                <input className="input-base" value={form.venue} onChange={(e) => setForm((p) => ({ ...p, venue: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#1A1A2E] mb-1.5">Duration (min)</label>
                <input type="number" min={5} className="input-base" value={form.durationMinutes} onChange={(e) => setForm((p) => ({ ...p, durationMinutes: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#1A1A2E] mb-1.5">Max per Slot</label>
                <input type="number" min={1} className="input-base" value={form.maxPerSlot} onChange={(e) => setForm((p) => ({ ...p, maxPerSlot: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#1A1A2E] mb-1.5">Type</label>
                <select className="input-base" value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}>
                  <option value="USER_BASED">User-based</option>
                  <option value="RESOURCE_BASED">Resource-based</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#1A1A2E] mb-1.5">Assignment</label>
                <select className="input-base" value={form.assignmentMode} onChange={(e) => setForm((p) => ({ ...p, assignmentMode: e.target.value }))}>
                  <option value="AUTOMATIC">Automatic</option>
                  <option value="MANUAL">Manual</option>
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-semibold text-[#1A1A2E] mb-1.5">Description</label>
              <textarea className="input-base resize-none" rows={4} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex items-center gap-2 text-sm text-[#1A1A2E]">
                <input type="checkbox" checked={form.manualConfirm} onChange={(e) => setForm((p) => ({ ...p, manualConfirm: e.target.checked }))} />
                Manual confirmation required
              </label>
              <label className="flex items-center gap-2 text-sm text-[#1A1A2E]">
                <input type="checkbox" checked={form.advancePayment} onChange={(e) => setForm((p) => ({ ...p, advancePayment: e.target.checked }))} />
                Advance payment required
              </label>
            </div>

            {form.advancePayment && (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-[#1A1A2E] mb-1.5">Payment Amount</label>
                  <input type="number" min={0} step="0.01" className="input-base" value={form.paymentAmount} onChange={(e) => setForm((p) => ({ ...p, paymentAmount: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#1A1A2E] mb-1.5">Currency</label>
                  <input className="input-base" value={form.currency} onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value }))} />
                </div>
              </div>
            )}

            {error && (
              <div className="mt-4 px-4 py-3 rounded-xl bg-[#FFEBEE] border border-[#C62828]/20 text-sm text-[#C62828]">
                {error}
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-2">
              <button onClick={save} disabled={saving} className="btn-primary py-2.5 px-5 rounded-xl disabled:opacity-60">
                {saving ? "Saving..." : "Save All Changes"}
              </button>
              <button onClick={togglePublish} disabled={saving} className="btn-outline py-2.5 px-5 rounded-xl disabled:opacity-60">
                {form.isPublished ? "Unpublish Service" : "Publish Service"}
              </button>
              <button onClick={copyShare} disabled={sharing} className="btn-outline py-2.5 px-5 rounded-xl disabled:opacity-60">
                {sharing ? "Generating..." : "Copy Share URL"}
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
