"use client";

import { useState, useEffect, useCallback } from "react";
import useSWR from "swr";
import OrganiserLayout from "@/components/organiser/OrganiserLayout";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Booking {
  id: string;
  status: string;
  paymentStatus: string;
  selectedMode: string | null;
  notes: string | null;
  createdAt: string;
  confirmedAt: string | null;
  cancelledAt: string | null;
  customer: { id: string; name: string; email: string };
  service: { id: string; title: string };
  slot: { id: string; start: string; end: string };
}

// ─── Config ───────────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  PENDING:   { label: "Pending",      bg: "#FFF3E0", text: "#E65100" },
  CONFIRMED: { label: "Confirmed",    bg: "#E8F5E9", text: "#2E7D32" },
  REQUEST:   { label: "Needs Review", bg: "#F3E5F5", text: "#724A6A" },
  CANCELLED: { label: "Cancelled",    bg: "#FFEBEE", text: "#C62828" },
  COMPLETED: { label: "Completed",    bg: "#E1F5FE", text: "#0277BD" },
  REJECTED:  { label: "Rejected",     bg: "#FFEBEE", text: "#C62828" },
  RESCHEDULED:{ label: "Rescheduled", bg: "#F3E5F5", text: "#6A1B9A" },
  NO_SHOW:   { label: "No Show",      bg: "#ECEFF1", text: "#546E7A" },
};

const FILTER_STATUSES = ["all", "PENDING", "CONFIRMED", "REQUEST", "CANCELLED", "COMPLETED"];
const PAGE_SIZE = 20;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
  return <div className={`skeleton rounded-xl ${className}`} />;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function OrganiserBookingsPage() {
  const [filter, setFilter]               = useState("all");
  const [modeFilter, setModeFilter]       = useState("all");
  const [search, setSearch]               = useState("");
  const [debouncedSearch, setDebounced]   = useState("");
  const [page, setPage]                   = useState(1);
  const [acting, setActing]               = useState<string | null>(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setDebounced(search); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  // Build URL
  const buildUrl = useCallback(() => {
    const p = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
    if (filter !== "all") p.set("status", filter);
    if (modeFilter !== "all") p.set("mode", modeFilter);
    if (debouncedSearch) p.set("search", debouncedSearch);
    return `/api/organiser/bookings?${p}`;
  }, [page, filter, modeFilter, debouncedSearch]);

  const { data, error, mutate, isLoading } = useSWR(
    buildUrl,
    (url) => fetch(url).then((r) => r.json()),
    { refreshInterval: 8000, revalidateOnFocus: true }
  );

  const bookings: Booking[] = data?.data ?? [];
  const total: number       = data?.pagination?.total ?? 0;
  const totalPages          = Math.ceil(total / PAGE_SIZE);

  // ── Actions ────────────────────────────────────────────────────────────────
  const doAction = async (id: string, action: "confirm" | "reject" | "cancel") => {
    setActing(id + action);
    const endpoint =
      action === "confirm" ? `/api/bookings/${id}/confirm`
      : action === "reject" ? `/api/bookings/${id}/reject`
      : `/api/bookings/${id}/cancel`;
    await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    mutate();
    setActing(null);
  };

  return (
    <OrganiserLayout>
      <div className="flex flex-col gap-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#1A1A2E]">All Bookings</h1>
            <p className="text-sm text-[#4A4A6A] mt-1">
              {isLoading ? "Loading…" : `${total.toLocaleString()} booking${total !== 1 ? "s" : ""} total`}
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

        {/* Search + Status filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-2 flex-1 border border-[#E8E0D0] rounded-xl bg-white px-3 h-10">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8A8AAA" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              className="flex-1 bg-transparent outline-none text-sm placeholder:text-[#8A8AAA] text-[#1A1A2E]"
              placeholder="Search customer or service…"
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
          <div className="flex gap-2 flex-wrap">
            {FILTER_STATUSES.map((f) => {
              const cfg = STATUS_CONFIG[f];
              return (
                <button
                  key={f}
                  onClick={() => { setFilter(f); setPage(1); }}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    filter === f
                      ? "bg-[#724A6A] text-white shadow-[0_2px_8px_rgba(114,74,106,0.3)]"
                      : "bg-[#FFFBE9] text-[#4A4A6A] border border-[#E8E0D0] hover:border-[#724A6A] hover:text-[#724A6A]"
                  }`}
                >
                  {cfg?.label ?? "All"}
                </button>
              );
            })}
          </div>
          <div className="flex gap-2 flex-wrap ml-auto">
            {["all", "VIRTUAL", "PHYSICAL"].map((m) => (
              <button
                key={m}
                onClick={() => { setModeFilter(m); setPage(1); }}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  modeFilter === m
                    ? "bg-[#1A1A2E] text-white shadow-[0_2px_8px_rgba(26,26,46,0.3)]"
                    : "bg-[#FFFBE9] text-[#4A4A6A] border border-[#E8E0D0] hover:border-[#1A1A2E] hover:text-[#1A1A2E]"
                }`}
              >
                {m === "all" ? "All Modes" : m === "VIRTUAL" ? "Virtual" : "Physical"}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-[#E8E0D0] shadow-[0_2px_12px_rgba(114,74,106,0.06)] overflow-hidden">
          {isLoading ? (
            <div className="p-4 flex flex-col gap-3">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
            </div>
          ) : error ? (
            <div className="text-center py-16">
              <span className="text-4xl mb-3 block">⚠️</span>
              <p className="text-sm text-[#C62828] mb-3">Failed to load bookings.</p>
              <button onClick={() => mutate()} className="btn-primary text-sm py-2 px-4">Retry</button>
            </div>
          ) : bookings.length === 0 ? (
            <div className="text-center py-12">
              <span className="text-4xl mb-3 block">📭</span>
              <p className="text-sm text-[#8A8AAA]">
                {search || filter !== "all" ? "No bookings match your filters." : "No bookings yet."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#E8E0D0] bg-[#FFFBE9]">
                    {["Customer", "Service", "Mode", "Date & Time", "Status", "Payment", "Actions"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[#8A8AAA] uppercase tracking-wide whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0EAD8]">
                  {bookings.map((b) => {
                    const sc = STATUS_CONFIG[b.status] ?? { label: b.status, bg: "#ECEFF1", text: "#546E7A" };
                    const pc = b.paymentStatus === "PAID"
                      ? { bg: "#E8F5E9", text: "#2E7D32" }
                      : b.paymentStatus === "UNPAID"
                      ? { bg: "#FFF3E0", text: "#E65100" }
                      : { bg: "#ECEFF1", text: "#546E7A" };

                    return (
                      <tr key={b.id} className="hover:bg-[#FFFBE9] transition-colors">
                        {/* Customer */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-[#F5EDF4] flex items-center justify-center text-xs font-bold text-[#724A6A] flex-shrink-0">
                              {b.customer?.name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() ?? "?"}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-[#1A1A2E] whitespace-nowrap">{b.customer?.name ?? "—"}</p>
                              <p className="text-xs text-[#8A8AAA]">{b.customer?.email}</p>
                            </div>
                          </div>
                        </td>

                        {/* Service */}
                        <td className="px-4 py-3">
                          <p className="text-sm text-[#1A1A2E] whitespace-nowrap">{b.service?.title ?? "—"}</p>
                        </td>

                        {/* Mode */}
                        <td className="px-4 py-3">
                          {b.selectedMode === "VIRTUAL" ? (
                            <span className="badge text-[11px] bg-[#E3F2FD] text-[#1565C0]">💻 Virtual</span>
                          ) : b.selectedMode === "PHYSICAL" ? (
                            <span className="badge text-[11px] bg-[#F3E5F5] text-[#6A1B9A]">📍 Physical</span>
                          ) : (
                            <span className="badge text-[11px] bg-[#ECEFF1] text-[#546E7A]">Unknown</span>
                          )}
                        </td>

                        {/* Date & Time */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <p className="text-sm text-[#4A4A6A]">{b.slot?.start ? fmtDate(b.slot.start) : "—"}</p>
                          <p className="text-xs text-[#8A8AAA]">{b.slot?.start ? fmtTime(b.slot.start) : ""}</p>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          <span className="badge text-[11px] font-semibold" style={{ background: sc.bg, color: sc.text }}>
                            {sc.label}
                          </span>
                        </td>

                        {/* Payment */}
                        <td className="px-4 py-3">
                          <span className="badge text-[11px]" style={{ background: pc.bg, color: pc.text }}>
                            {b.paymentStatus}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3">
                          <div className="flex gap-1 flex-wrap">
                            {(b.status === "REQUEST" || b.status === "PENDING") && (
                              <button
                                onClick={() => doAction(b.id, "confirm")}
                                disabled={acting === b.id + "confirm"}
                                className="text-[10px] font-bold text-[#2E7D32] px-2 py-1 rounded-lg bg-[#E8F5E9] hover:bg-[#C8E6C9] transition-colors disabled:opacity-50 whitespace-nowrap"
                              >
                                {acting === b.id + "confirm" ? "…" : "✓ Confirm"}
                              </button>
                            )}
                            {b.status === "REQUEST" && (
                              <button
                                onClick={() => doAction(b.id, "reject")}
                                disabled={acting === b.id + "reject"}
                                className="text-[10px] font-bold text-[#E65100] px-2 py-1 rounded-lg bg-[#FFF3E0] hover:bg-[#FFE0B2] transition-colors disabled:opacity-50"
                              >
                                {acting === b.id + "reject" ? "…" : "✗ Reject"}
                              </button>
                            )}
                            {["PENDING", "CONFIRMED", "REQUEST"].includes(b.status) && (
                              <button
                                onClick={() => doAction(b.id, "cancel")}
                                disabled={acting === b.id + "cancel"}
                                className="text-[10px] font-bold text-[#C62828] px-2 py-1 rounded-lg bg-[#FFEBEE] hover:bg-[#FFCDD2] transition-colors disabled:opacity-50"
                              >
                                {acting === b.id + "cancel" ? "…" : "Cancel"}
                              </button>
                            )}
                            {!["PENDING", "CONFIRMED", "REQUEST"].includes(b.status) && (
                              <span className="text-xs text-[#8A8AAA] italic">—</span>
                            )}
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
    </OrganiserLayout>
  );
}
