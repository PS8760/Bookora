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
    venue: "",
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
          venue: svc.venue ?? "",
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
      <div className="max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-[#1A1A2E]">Edit Service</h1>
          <Link href="/organiser/services" className="btn-outline text-sm py-2 px-4">
            Back
          </Link>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl border border-[#E8E0D0] p-6">Loading...</div>
        ) : (
          <form
            onSubmit={handleSave}
            className="bg-white rounded-2xl border border-[#E8E0D0] p-6 shadow-[0_2px_12px_rgba(114,74,106,0.06)] flex flex-col gap-4"
          >
            <div>
              <label className="block text-sm font-semibold text-[#1A1A2E] mb-1.5">Title *</label>
              <input
                className="input-base"
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#1A1A2E] mb-1.5">Description</label>
              <textarea
                rows={3}
                className="input-base resize-none"
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-[#1A1A2E] mb-1.5">Category</label>
                <input
                  className="input-base"
                  value={form.category}
                  onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#1A1A2E] mb-1.5">Icon (emoji)</label>
                <input
                  className="input-base"
                  value={form.icon}
                  onChange={(e) => setForm((prev) => ({ ...prev, icon: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-[#1A1A2E] mb-1.5">Duration (minutes)</label>
                <input
                  type="number"
                  min={5}
                  className="input-base"
                  value={form.durationMinutes}
                  onChange={(e) => setForm((prev) => ({ ...prev, durationMinutes: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#1A1A2E] mb-1.5">Venue</label>
                <input
                  className="input-base"
                  value={form.venue}
                  onChange={(e) => setForm((prev) => ({ ...prev, venue: e.target.value }))}
                />
              </div>
            </div>

            {error && (
              <div className="px-4 py-3 rounded-xl bg-[#FFEBEE] border border-[#C62828]/20 text-sm text-[#C62828]">
                {error}
              </div>
            )}

            <button type="submit" disabled={saving} className="btn-primary py-3 rounded-xl disabled:opacity-60">
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </form>
        )}
      </div>
    </OrganiserLayout>
  );
}
