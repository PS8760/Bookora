"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import useSWR from "swr";
import AdminLayout from "@/components/admin/AdminLayout";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Service {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  icon: string | null;
  durationMinutes: number;
  type: string;
  isPublished: boolean;
  advancePayment: boolean;
  paymentAmount: number | null;
  currency: string;
  manualConfirm: boolean;
  maxPerSlot: number;
  venue: string | null;
  createdAt: string;
  organiser: { id: string; name: string; email: string };
  bookingCount: number;
  questionCount: number;
}

// ─── Config ───────────────────────────────────────────────────────────────────
const CATEGORY_COLORS: Record<string, { bg: string; accent: string }> = {
  Health:    { bg: "#E8F5E9", accent: "#2E7D32" },
  Beauty:    { bg: "#FFF8E1", accent: "#D4A017" },
  Fitness:   { bg: "#FFF3E0", accent: "#E65100" },
  Education: { bg: "#E0F2F1", accent: "#00695C" },
  "Pet Care":{ bg: "#E8EAF6", accent: "#3949AB" },
  Wellness:  { bg: "#F3E5F5", accent: "#724A6A" },
  default:   { bg: "#E1F5FE", accent: "#0277BD" },
};

const PAGE_SIZE = 20;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
  return <div className={`skeleton rounded-xl ${className}`} />;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function formatPrice(s: Service) {
  if (!s.advancePayment || !s.paymentAmount) return "Free";
  const sym = s.currency === "INR" ? "₹" : s.currency;
  return `${sym}${s.paymentAmount.toLocaleString("en-IN")}`;
}

function getCategoryColors(category: string | null) {
  return CATEGORY_COLORS[category ?? ""] ?? CATEGORY_COLORS.default;
}

// ─── Service Detail Drawer ────────────────────────────────────────────────────
function ServiceDrawer({
  service,
  onClose,
  onTogglePublish,
  onDelete,
  onSave,
  onShare,
}: {
  service: Service;
  onClose: () => void;
  onTogglePublish: (id: string, current: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onSave: (id: string, payload: Partial<Service>) => Promise<void>;
  onShare: (id: string) => Promise<void>;
}) {
  const [acting, setActing] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: service.title,
    category: service.category ?? "",
    durationMinutes: String(service.durationMinutes),
    venue: service.venue ?? "",
  });
  const colors = getCategoryColors(service.category);

  const doToggle = async () => {
    setActing("toggle");
    await onTogglePublish(service.id, service.isPublished);
    setActing(null);
    onClose();
  };

  const doDelete = async () => {
    if (!confirm(`Delete "${service.title}"? This cannot be undone.`)) return;
    setActing("delete");
    await onDelete(service.id);
    setActing(null);
    onClose();
  };

  const doSave = async () => {
    if (!form.title.trim()) return;
    setActing("save");
    await onSave(service.id, {
      title: form.title.trim(),
      category: form.category.trim() || null,
      durationMinutes: Number(form.durationMinutes || service.durationMinutes),
      venue: form.venue.trim() || null,
    });
    setActing(null);
    onClose();
  };

  const doShare = async () => {
    setActing("share");
    await onShare(service.id);
    setActing(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-full max-w-md bg-white shadow-2xl flex flex-col overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E0D0] sticky top-0 bg-white z-10">
          <div>
            <h2 className="font-bold text-[#1A1A2E]">Service Details</h2>
            <p className="text-xs text-[#8A8AAA] mt-0.5 font-mono">{service.id.slice(0, 8)}…</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-[#F5EDF4] flex items-center justify-center text-[#8A8AAA] hover:text-[#724A6A] transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="p-6 flex flex-col gap-5">
          {/* Icon + Title */}
          <div className="flex items-start gap-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
              style={{ background: colors.bg }}
            >
              {service.icon || "📅"}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-lg text-[#1A1A2E] leading-tight">{service.title}</h3>
              <div className="flex flex-wrap gap-1.5 mt-2">
                <span
                  className={`badge text-[10px] ${
                    service.isPublished
                      ? "bg-[#E8F5E9] text-[#2E7D32]"
                      : "bg-[#FFF3E0] text-[#E65100]"
                  }`}
                >
                  {service.isPublished ? "Published" : "Draft"}
                </span>
                {service.category && (
                  <span className="badge text-[10px]" style={{ background: colors.bg, color: colors.accent }}>
                    {service.category}
                  </span>
                )}
                <span className="badge text-[10px] bg-[#E1F5FE] text-[#0277BD]">
                  {service.type === "USER_BASED" ? "User-Based" : "Resource-Based"}
                </span>
              </div>
            </div>
          </div>

          {/* Description */}
          {service.description && (
            <div className="bg-[#FFFBE9] rounded-xl p-4 border border-[#E8E0D0]">
              <p className="text-xs font-semibold text-[#8A8AAA] uppercase tracking-wide mb-1.5">Description</p>
              <p className="text-sm text-[#4A4A6A] leading-relaxed">{service.description}</p>
            </div>
          )}

          {/* Organiser */}
          <div className="bg-[#FFFBE9] rounded-xl p-4 border border-[#E8E0D0]">
            <p className="text-xs font-semibold text-[#8A8AAA] uppercase tracking-wide mb-2">Organiser</p>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#F5EDF4] flex items-center justify-center text-xs font-bold text-[#724A6A]">
                {service.organiser.name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-sm text-[#1A1A2E]">{service.organiser.name}</p>
                <p className="text-xs text-[#8A8AAA]">{service.organiser.email}</p>
              </div>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Duration", value: `${service.durationMinutes} min`, icon: "⏱" },
              { label: "Price", value: formatPrice(service), icon: "💰" },
              { label: "Bookings", value: service.bookingCount, icon: "📅" },
              { label: "Max / Slot", value: service.maxPerSlot, icon: "👥" },
            ].map((item) => (
              <div key={item.label} className="bg-[#FFFBE9] rounded-xl p-3 border border-[#E8E0D0] text-center">
                <p className="text-lg mb-0.5">{item.icon}</p>
                <p className="font-bold text-sm text-[#1A1A2E]">{item.value}</p>
                <p className="text-[10px] text-[#8A8AAA]">{item.label}</p>
              </div>
            ))}
          </div>

          {/* Details */}
          <div className="space-y-2">
            {[
              { label: "Manual Confirm", value: service.manualConfirm ? "Yes" : "No" },
              { label: "Venue", value: service.venue || "—" },
              { label: "Questions", value: `${service.questionCount} configured` },
              { label: "Created", value: fmtDate(service.createdAt) },
            ].map((row) => (
              <div key={row.label} className="flex justify-between text-xs">
                <span className="text-[#4A4A6A]">{row.label}</span>
                <span className="font-medium text-[#1A1A2E]">{row.value}</span>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 pt-2 border-t border-[#E8E0D0]">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-[#8A8AAA] mb-1">Title</label>
                <input
                  className="input-base h-9 text-sm"
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#8A8AAA] mb-1">Category</label>
                <input
                  className="input-base h-9 text-sm"
                  value={form.category}
                  onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#8A8AAA] mb-1">Duration (min)</label>
                <input
                  type="number"
                  min={5}
                  className="input-base h-9 text-sm"
                  value={form.durationMinutes}
                  onChange={(e) => setForm((prev) => ({ ...prev, durationMinutes: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#8A8AAA] mb-1">Venue</label>
                <input
                  className="input-base h-9 text-sm"
                  value={form.venue}
                  onChange={(e) => setForm((prev) => ({ ...prev, venue: e.target.value }))}
                />
              </div>
            </div>
            <button
              onClick={doSave}
              disabled={acting !== null || !form.title.trim()}
              className="w-full py-2.5 rounded-xl bg-[#E1F5FE] text-[#0277BD] font-semibold text-sm hover:bg-[#B3E5FC] transition-colors disabled:opacity-50"
            >
              {acting === "save" ? "Saving…" : "Save Changes"}
            </button>
            <button
              onClick={doShare}
              disabled={acting !== null}
              className="w-full py-2.5 rounded-xl bg-[#F5EDF4] text-[#724A6A] font-semibold text-sm hover:bg-[#E8D5E4] transition-colors disabled:opacity-50"
            >
              {acting === "share" ? "Generating…" : "Copy Share URL"}
            </button>
            <button
              onClick={doToggle}
              disabled={acting !== null}
              className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50 ${
                service.isPublished
                  ? "bg-[#FFF3E0] text-[#E65100] hover:bg-[#FFE0B2]"
                  : "bg-[#E8F5E9] text-[#2E7D32] hover:bg-[#C8E6C9]"
              }`}
            >
              {acting === "toggle"
                ? "Updating…"
                : service.isPublished
                ? "Unpublish Service"
                : "Publish Service"}
            </button>
            <button
              onClick={doDelete}
              disabled={acting !== null}
              className="w-full py-2.5 rounded-xl bg-[#FFEBEE] text-[#C62828] font-semibold text-sm hover:bg-[#FFCDD2] transition-colors disabled:opacity-50"
            >
              {acting === "delete" ? "Deleting…" : "Delete Service"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminServicesPage() {
  const [search, setSearch]                   = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryFilter, setCategoryFilter]   = useState("all");
  const [publishedFilter, setPublishedFilter] = useState("all");
  const [page, setPage]                       = useState(1);
  const [selected, setSelected]               = useState<Service | null>(null);
  const [categories, setCategories]           = useState<string[]>([]);
  const [busyId, setBusyId]                   = useState<string | null>(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  // Build URL
  const buildUrl = useCallback(() => {
    const p = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
    if (debouncedSearch) p.set("search", debouncedSearch);
    if (categoryFilter !== "all") p.set("category", categoryFilter);
    if (publishedFilter !== "all") p.set("published", publishedFilter);
    return `/api/admin/services?${p}`;
  }, [page, debouncedSearch, categoryFilter, publishedFilter]);

  const { data, error, mutate, isLoading } = useSWR(
    buildUrl,
    (url) => fetch(url).then((r) => r.json()),
    { refreshInterval: 10000, revalidateOnFocus: true }
  );

  const services: Service[] = data?.data ?? [];
  const total: number       = data?.pagination?.total ?? 0;
  const totalPages          = Math.ceil(total / PAGE_SIZE);

  // Extract unique categories from loaded services
  useEffect(() => {
    if (services.length > 0) {
      const cats = Array.from(
        new Set(services.map((s) => s.category).filter(Boolean) as string[])
      ).sort();
      setCategories(cats);
    }
  }, [services]);

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleTogglePublish = async (id: string, current: boolean) => {
    setBusyId(id);
    try {
      const endpoint = `/api/appointments/${id}/publish`;
      const res = await fetch(endpoint, { method: current ? "DELETE" : "POST" });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        alert(j?.error?.message ?? "Unable to update publish status.");
        return;
      }
      await mutate();
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/services/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        alert(j?.error?.message ?? "Unable to delete service.");
        return;
      }
      await mutate();
    } finally {
      setBusyId(null);
    }
  };

  const handleSave = async (id: string, payload: Partial<Service>) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        alert(j?.error?.message ?? "Unable to save service changes.");
        return;
      }
      await mutate();
    } finally {
      setBusyId(null);
    }
  };

  const handleShare = async (id: string) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/appointments/${id}/share-link`);
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        alert(j?.error?.message ?? "Unable to generate share link.");
        return;
      }
      const j = await res.json();
      const shareUrl = j?.data?.shareUrl;
      if (!shareUrl) {
        alert("Unable to generate share link.");
        return;
      }
      await navigator.clipboard.writeText(shareUrl);
      alert("Share URL copied.");
    } finally {
      setBusyId(null);
    }
  };

  // ── Stats ──────────────────────────────────────────────────────────────────
  const published = services.filter((s) => s.isPublished).length;
  const drafts    = services.filter((s) => !s.isPublished).length;
  const totalBookings = services.reduce((acc, s) => acc + s.bookingCount, 0);

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#1A1A2E]">Services</h1>
            <p className="text-sm text-[#4A4A6A] mt-1">
              {isLoading ? "Loading…" : `${total.toLocaleString()} total services across the platform`}
            </p>
          </div>
          <button
            onClick={() => mutate()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#E8E0D0] text-sm text-[#4A4A6A] hover:border-[#724A6A] hover:text-[#724A6A] transition-colors self-start sm:self-auto"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
            Refresh
          </button>
        </div>

        {/* Quick stats */}
        {!isLoading && services.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Published",      value: published,      bg: "#E8F5E9", text: "#2E7D32" },
              { label: "Drafts",         value: drafts,         bg: "#FFF3E0", text: "#E65100" },
              { label: "Total Bookings", value: totalBookings,  bg: "#F5EDF4", text: "#724A6A" },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-2xl border border-[#E8E0D0] p-3 text-center shadow-[0_2px_8px_rgba(114,74,106,0.06)]">
                <p className="text-xl font-bold" style={{ color: s.text }}>{s.value}</p>
                <p className="text-[11px] text-[#8A8AAA] mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Search + Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-2 flex-1 border border-[#E8E0D0] rounded-xl bg-white px-4 h-10">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8A8AAA" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              className="flex-1 bg-transparent outline-none text-sm placeholder:text-[#8A8AAA] text-[#1A1A2E]"
              placeholder="Search services or organisers…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch("")} className="text-[#8A8AAA] hover:text-[#724A6A]">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            )}
          </div>
          <select
            value={publishedFilter}
            onChange={(e) => { setPublishedFilter(e.target.value); setPage(1); }}
            className="input-base h-10 w-full sm:w-44 cursor-pointer text-sm"
          >
            <option value="all">All Status</option>
            <option value="true">Published</option>
            <option value="false">Draft</option>
          </select>
        </div>

        {/* Category pills */}
        {categories.length > 0 && (
          <div className="flex gap-2 flex-wrap -mt-2">
            {["all", ...categories].map((c) => (
              <button
                key={c}
                onClick={() => { setCategoryFilter(c); setPage(1); }}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all capitalize ${
                  categoryFilter === c
                    ? "bg-[#724A6A] text-white shadow-[0_2px_8px_rgba(114,74,106,0.3)]"
                    : "bg-[#FFFBE9] text-[#4A4A6A] border border-[#E8E0D0] hover:border-[#724A6A] hover:text-[#724A6A]"
                }`}
              >
                {c === "all" ? "All Categories" : c}
              </button>
            ))}
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-2xl border border-[#E8E0D0] shadow-[0_2px_12px_rgba(114,74,106,0.06)] overflow-hidden">
          {isLoading ? (
            <div className="p-4 flex flex-col gap-3">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
            </div>
          ) : error ? (
            <div className="text-center py-16">
              <span className="text-4xl mb-3 block">⚠️</span>
              <p className="text-sm text-[#C62828] mb-3">Failed to load services.</p>
              <button onClick={() => mutate()} className="btn-primary text-sm py-2 px-4">Retry</button>
            </div>
          ) : services.length === 0 ? (
            <div className="text-center py-16">
              <span className="text-4xl mb-3 block">🏢</span>
              <p className="text-sm text-[#8A8AAA]">
                {search || categoryFilter !== "all" || publishedFilter !== "all"
                  ? "No services match your filters."
                  : "No services on the platform yet."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#E8E0D0] bg-[#FFFBE9]">
                    {["Service", "Organiser", "Category", "Duration", "Price", "Bookings", "Status", "Created", ""].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[#8A8AAA] uppercase tracking-wide whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0EAD8]">
                  {services.map((s) => {
                    const colors = getCategoryColors(s.category);
                    return (
                      <tr
                        key={s.id}
                        className="hover:bg-[#FFFBE9] transition-colors cursor-pointer"
                        onClick={() => setSelected(s)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                              style={{ background: colors.bg }}
                            >
                              {s.icon || "📅"}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-[#1A1A2E] whitespace-nowrap">{s.title}</p>
                              {s.description && (
                                <p className="text-xs text-[#8A8AAA] truncate max-w-[180px]">{s.description}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-[#1A1A2E] whitespace-nowrap">{s.organiser.name}</p>
                          <p className="text-xs text-[#8A8AAA]">{s.organiser.email}</p>
                        </td>
                        <td className="px-4 py-3">
                          {s.category ? (
                            <span className="badge text-[10px]" style={{ background: colors.bg, color: colors.accent }}>
                              {s.category}
                            </span>
                          ) : (
                            <span className="text-xs text-[#8A8AAA]">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-[#4A4A6A] whitespace-nowrap">
                          {s.durationMinutes} min
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-[#724A6A] whitespace-nowrap">
                          {formatPrice(s)}
                        </td>
                        <td className="px-4 py-3 text-sm text-[#4A4A6A]">
                          {s.bookingCount}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`badge text-[10px] ${
                              s.isPublished
                                ? "bg-[#E8F5E9] text-[#2E7D32]"
                                : "bg-[#FFF3E0] text-[#E65100]"
                            }`}
                          >
                            {s.isPublished ? "Published" : "Draft"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-[#8A8AAA] whitespace-nowrap">
                          {fmtDate(s.createdAt)}
                        </td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleTogglePublish(s.id, s.isPublished)}
                              disabled={busyId === s.id}
                              className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-colors whitespace-nowrap ${
                                s.isPublished
                                  ? "bg-[#FFF3E0] text-[#E65100] hover:bg-[#FFE0B2]"
                                  : "bg-[#E8F5E9] text-[#2E7D32] hover:bg-[#C8E6C9]"
                              } disabled:opacity-50`}
                            >
                              {busyId === s.id ? "..." : s.isPublished ? "Unpublish" : "Publish"}
                            </button>
                            <button
                              onClick={() => handleShare(s.id)}
                              disabled={busyId === s.id}
                              className="text-[10px] font-bold text-[#724A6A] px-2 py-1 rounded-lg bg-[#F5EDF4] hover:bg-[#E8D5E4] transition-colors disabled:opacity-50"
                            >
                              {busyId === s.id ? "..." : "Share"}
                            </button>
                            <button
                              onClick={() => setSelected(s)}
                              disabled={busyId === s.id}
                              className="text-[10px] font-bold text-[#0277BD] px-2 py-1 rounded-lg bg-[#E1F5FE] hover:bg-[#B3E5FC] transition-colors disabled:opacity-50"
                            >
                              Edit
                            </button>
                            <Link
                              href={`/admin/services/${s.id}/edit`}
                              className="text-[10px] font-bold text-[#1A1A2E] px-2 py-1 rounded-lg bg-[#FFFBE9] border border-[#E8E0D0] hover:border-[#724A6A] hover:text-[#724A6A] transition-colors"
                            >
                              Full Edit
                            </Link>
                            <button
                              onClick={async () => {
                                if (!confirm(`Delete "${s.title}"?`)) return;
                                await handleDelete(s.id);
                              }}
                              disabled={busyId === s.id}
                              className="text-[10px] font-bold text-[#C62828] px-2 py-1 rounded-lg bg-[#FFEBEE] hover:bg-[#FFCDD2] transition-colors disabled:opacity-50"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {total > PAGE_SIZE && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-[#E8E0D0]">
              <p className="text-xs text-[#8A8AAA]">
                Showing {Math.min((page - 1) * PAGE_SIZE + 1, total)}–{Math.min(page * PAGE_SIZE, total)} of {total.toLocaleString()}
              </p>
              <div className="flex items-center gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                  className="px-3 py-1.5 text-xs rounded-lg border border-[#E8E0D0] disabled:opacity-40 hover:border-[#724A6A] transition-colors"
                >
                  ← Prev
                </button>
                <span className="text-xs text-[#8A8AAA]">{page} / {totalPages}</span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                  className="px-3 py-1.5 text-xs rounded-lg border border-[#E8E0D0] disabled:opacity-40 hover:border-[#724A6A] transition-colors"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Detail drawer */}
      {selected && (
        <ServiceDrawer
          service={selected}
          onClose={() => setSelected(null)}
          onTogglePublish={handleTogglePublish}
          onDelete={handleDelete}
          onSave={handleSave}
          onShare={handleShare}
        />
      )}
    </AdminLayout>
  );
}
