"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import OrganiserLayout from "@/components/organiser/OrganiserLayout";

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

export default function EditServicePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const serviceId = params.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
    if (!serviceId) return;
    setLoading(true);
    setError(null);

    fetch(`/api/appointments/${serviceId}`)
      .then((r) => r.json())
      .then((j) => {
        if (!j?.data) {
          setError(j?.error?.message ?? "Failed to load service.");
          return;
        }
        const svc: Service = j.data;
        setForm({
          title: svc.title ?? "",
          description: svc.description ?? "",
          category: svc.category ?? "",
          icon: svc.icon ?? "",
          durationMinutes: String(svc.durationMinutes ?? 30),
          type: svc.type ?? "USER_BASED",
          advancePayment: Boolean(svc.advancePayment),
          paymentAmount: svc.paymentAmount ?? "",
          currency: svc.currency ?? "INR",
          manualConfirm: Boolean(svc.manualConfirm),
          assignmentMode: svc.assignmentMode ?? "AUTOMATIC",
          maxPerSlot: String(svc.maxPerSlot ?? 1),
          venue: svc.venue ?? "",
          isPublished: Boolean(svc.isPublished),
        });
      })
      .catch(() => setError("Failed to load service."))
      .finally(() => setLoading(false));
  }, [serviceId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/appointments/${serviceId}`, {
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
      router.push("/organiser/services");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <OrganiserLayout>
      <div className="max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#1A1A2E]">Edit Service</h1>
            <p className="text-sm text-[#8A8AAA] mt-1">Configure your service details and booking rules</p>
          </div>
          <Link href="/organiser/services" className="btn-outline text-sm py-2 px-4">
            Back to List
          </Link>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl border border-[#E8E0D0] p-8 text-center text-[#8A8AAA]">
            <div className="animate-spin w-8 h-8 border-4 border-[#724A6A] border-t-transparent rounded-full mx-auto mb-4" />
            Loading service configuration...
          </div>
        ) : (
          <form
            onSubmit={handleSave}
            className="bg-white rounded-2xl border border-[#E8E0D0] p-6 shadow-[0_2px_12px_rgba(114,74,106,0.06)] flex flex-col gap-6"
          >
            {/* Basic Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-semibold text-[#1A1A2E] mb-1.5">Title *</label>
                <input
                  className="input-base"
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-semibold text-[#1A1A2E] mb-1.5">Description</label>
                <textarea
                  rows={3}
                  className="input-base resize-none"
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="What should customers know about this service?"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#1A1A2E] mb-1.5">Category</label>
                <input
                  className="input-base"
                  value={form.category}
                  onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                  placeholder="e.g. Health, Beauty"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#1A1A2E] mb-1.5">Icon (emoji)</label>
                <input
                  className="input-base"
                  value={form.icon}
                  onChange={(e) => setForm((prev) => ({ ...prev, icon: e.target.value }))}
                  placeholder="e.g. 🏥, ✂️"
                />
              </div>
            </div>

            <hr className="border-[#F0EAD8]" />

            {/* Logistics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-[#1A1A2E] mb-1.5">Duration (minutes)</label>
                <input
                  type="number"
                  min={5}
                  step={5}
                  className="input-base"
                  value={form.durationMinutes}
                  onChange={(e) => setForm((prev) => ({ ...prev, durationMinutes: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#1A1A2E] mb-1.5">Venue / Location</label>
                <input
                  className="input-base"
                  value={form.venue}
                  onChange={(e) => setForm((prev) => ({ ...prev, venue: e.target.value }))}
                  placeholder="e.g. Room 101, Online"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#1A1A2E] mb-1.5">Max Capacity per Slot</label>
                <input
                  type="number"
                  min={1}
                  className="input-base"
                  value={form.maxPerSlot}
                  onChange={(e) => setForm((prev) => ({ ...prev, maxPerSlot: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#1A1A2E] mb-1.5">Booking Type</label>
                <select
                  className="input-base"
                  value={form.type}
                  onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value as any }))}
                >
                  <option value="USER_BASED">User-Based (Staff Availability)</option>
                  <option value="RESOURCE_BASED">Resource-Based (Equipment/Room)</option>
                </select>
              </div>
            </div>

            <hr className="border-[#F0EAD8]" />

            {/* Rules & Payment */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="flex items-center gap-3 p-3 rounded-xl border border-[#E8E0D0] cursor-pointer hover:bg-[#FFFBE9] transition-colors">
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-[#724A6A]"
                    checked={form.manualConfirm}
                    onChange={(e) => setForm((prev) => ({ ...prev, manualConfirm: e.target.checked }))}
                  />
                  <div>
                    <p className="text-sm font-semibold text-[#1A1A2E]">Manual Confirmation</p>
                    <p className="text-[11px] text-[#8A8AAA]">You must approve each booking</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-xl border border-[#E8E0D0] cursor-pointer hover:bg-[#FFFBE9] transition-colors">
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-[#724A6A]"
                    checked={form.advancePayment}
                    onChange={(e) => setForm((prev) => ({ ...prev, advancePayment: e.target.checked }))}
                  />
                  <div>
                    <p className="text-sm font-semibold text-[#1A1A2E]">Advance Payment</p>
                    <p className="text-[11px] text-[#8A8AAA]">Require payment at checkout</p>
                  </div>
                </label>
              </div>

              {form.advancePayment && (
                <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-[#F5EDF4]/30 border border-[#D4B8CF]/30 animate-in fade-in slide-in-from-top-2">
                  <div>
                    <label className="block text-sm font-semibold text-[#1A1A2E] mb-1.5">Amount</label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      className="input-base"
                      value={form.paymentAmount}
                      onChange={(e) => setForm((prev) => ({ ...prev, paymentAmount: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[#1A1A2E] mb-1.5">Currency</label>
                    <input
                      className="input-base"
                      value={form.currency}
                      onChange={(e) => setForm((prev) => ({ ...prev, currency: e.target.value }))}
                    />
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="px-4 py-3 rounded-xl bg-[#FFEBEE] border border-[#C62828]/20 text-sm text-[#C62828] font-medium animate-shake">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="btn-primary flex-1 py-3.5 rounded-xl disabled:opacity-60 shadow-[0_4px_12px_rgba(114,74,106,0.2)]"
              >
                {saving ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                    Saving Changes...
                  </span>
                ) : "Save Service Configuration"}
              </button>
            </div>
          </form>
        )}
      </div>
    </OrganiserLayout>
  );
}
