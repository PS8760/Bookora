"use client";

import { useState, useCallback, useEffect } from "react";
import useSWR from "swr";
import AdminLayout from "@/components/admin/AdminLayout";
import { dashboardSWRConfig } from "@/lib/realtime";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Booking {
  id: string;
  status: string;
  paymentStatus: string;
  notes: string | null;
  createdAt: string;
  confirmedAt: string | null;
  cancelledAt: string | null;
  customer: { id: string; name: string; email: string };
  service: { id: string; title: string; organiser: { id: string; name: string } };
  slot: { id: string; start: string; end: string };
}

// ─── Config ───────────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  PENDING:     { label: "Pending",     bg: "#FFF3E0", text: "#E65100" },
  CONFIRMED:   { label: "Confirmed",   bg: "#E8F5E9", text: "#2E7D32" },
  CANCELLED:   { label: "Cancelled",   bg: "#FFEBEE", text: "#C62828" },
  COMPLETED:   { label: "Completed",   bg: "#E1F5FE", text: "#0277BD" },
  RESCHEDULED: { label: "Rescheduled", bg: "#F3E5F5", text: "#6A1B9A" },
  NO_SHOW:     { label: "No Show",     bg: "#ECEFF1", text: "#546E7A" },
  REQUEST:     { label: "Needs Review",bg: "#FFF8E1", text: "#D4A017" },
  REJECTED:    { label: "Rejected",    bg: "#FFEBEE", text: "#C62828" },
};

const PAYMENT_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  PAID:    { label: "Paid",    bg: "#E8F5E9", text: "#2E7D32" },
  UNPAID:  { label: "Unpaid",  bg: "#FFF3E0", text: "#E65100" },
  REFUNDED:{ label: "Refunded",bg: "#E1F5FE", text: "#0277BD" },
  NA:      { label: "N/A",     bg: "#ECEFF1", text: "#546E7A" },
};

const STATUSES = ["all", "PENDING", "CONFIRMED", "REQUEST", "CANCELLED", "COMPLETED", "RESCHEDULED", "NO_SHOW"];
const PAGE_SIZE = 20;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
  return <div className={`skeleton rounded-xl ${className}`} />;
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, bg: "#ECEFF1", text: "#546E7A" };
  return (
    <span className="badge text-[11px] font-semibold" style={{ background: cfg.bg, color: cfg.text }}>
      {cfg.label}
    </span>
  );
}

function PaymentBadge({ status }: { status: string }) {
  const cfg = PAYMENT_CONFIG[status] ?? PAYMENT_CONFIG.NA;
  return (
    <span className="badge text-[11px]" style={{ background: cfg.bg, color: cfg.text }}>
      {cfg.label}
    </span>
  );
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

// ─── Detail Drawer ────────────────────────────────────────────────────────────
function BookingDrawer({
  booking,
  onClose,
  onAction,
}: {
  booking: Booking;
  onClose: () => void;
  onAction: (id: string, action: "confirm" | "cancel" | "reject") => Promise<void>;
}) {
  const [acting, setActing] = useState<string | null>(null);

  const doAction = async (action: "confirm" | "cancel" | "reject") => {
    setActing(action);
    await onAction(booking.id, action);
    setActing(null);
    onClose();
  };

  const sc = STATUS_CONFIG[booking.status] ?? { label: booking.status, bg: "#ECEFF1", text: "#546E7A" };

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/40" onClick={onClose} />

      {/* Panel */}
      <div className="w-full max-w-md bg-white shadow-2xl flex flex-col overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E0D0] sticky top-0 bg-white z-10">
          <div>
            <h2 className="font-bold text-[#1A1A2E]">Booking Details</h2>
            <p className="text-xs text-[#8A8AAA] mt-0.5 font-mono">{booking.id.slice(0, 8)}…</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-[#F5EDF4] flex items-center justify-center text-[#8A8AAA] hover:text-[#724A6A] transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="p-6 flex flex-col gap-5">
          {/* Status row */}
          <div className="flex items-center gap-3">
            <StatusBadge status={booking.status} />
            <PaymentBadge status={booking.paymentStatus} />
          </div>

          {/* Customer */}
          <div className="bg-[#FFFBE9] rounded-xl p-4 border border-[#E8E0D0]">
            <p className="text-xs font-semibold text-[#8A8AAA] uppercase tracking-wide mb-2">Customer</p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#F5EDF4] flex items-center justify-center text-sm font-bold text-[#724A6A]">
                {booking.customer.name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-sm text-[#1A1A2E]">{booking.customer.name}</p>
                <p className="text-xs text-[#8A8AAA]">{booking.customer.email}</p>
              </div>
            </div>
          </div>

          {/* Service */}
          <div className="bg-[#FFFBE9] rounded-xl p-4 border border-[#E8E0D0]">
            <p className="text-xs font-semibold text-[#8A8AAA] uppercase tracking-wide mb-2">Service</p>
            <p className="font-semibold text-sm text-[#1A1A2E]">{booking.service.title}</p>
            <p className="text-xs text-[#8A8AAA] mt-0.5">by {booking.service.organiser.name}</p>
          </div>

          {/* Slot */}
          <div className="bg-[#FFFBE9] rounded-xl p-4 border border-[#E8E0D0]">
            <p className="text-xs font-semibold text-[#8A8AAA] uppercase tracking-wide mb-2">Appointment</p>
            <p className="font-semibold text-sm text-[#1A1A2E]">{fmtDate(booking.slot.start)}</p>
            <p className="text-xs text-[#8A8AAA] mt-0.5">{fmtTime(booking.slot.start)} – {fmtTime(booking.slot.end)}</p>
          </div>

          {/* Timeline */}
          <div>
            <p className="text-xs font-semibold text-[#8A8AAA] uppercase tracking-wide mb-3">Timeline</p>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-[#4A4A6A]">Created</span>
                <span className="font-medium text-[#1A1A2E]">{fmtDate(booking.createdAt)} {fmtTime(booking.createdAt)}</span>
              </div>
              {booking.confirmedAt && (
                <div className="flex justify-between text-xs">
                  <span className="text-[#4A4A6A]">Confirmed</span>
                  <span className="font-medium text-[#2E7D32]">{fmtDate(booking.confirmedAt)} {fmtTime(booking.confirmedAt)}</span>
                </div>
              )}
              {booking.cancelledAt && (
                <div className="flex justify-between text-xs">
                  <span className="text-[#4A4A6A]">Cancelled</span>
                  <span className="font-medium text-[#C62828]">{fmtDate(booking.cancelledAt)} {fmtTime(booking.cancelledAt)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          {booking.notes && (
            <div>
              <p className="text-xs font-semibold text-[#8A8AAA] uppercase tracking-wide mb-1">Notes</p>
              <p className="text-sm text-[#4A4A6A] bg-[#FFFBE9] rounded-xl p-3 border border-[#E8E0D0]">{booking.notes}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-2 pt-2 border-t border-[#E8E0D0]">
            {(booking.status === "PENDING" || booking.status === "REQUEST") && (
              <button
                onClick={() => doAction("confirm")}
                disabled={acting !== null}
                className="w-full py-2.5 rounded-xl bg-[#E8F5E9] text-[#2E7D32] font-semibold text-sm hover:bg-[#C8E6C9] transition-colors disabled:opacity-50"
              >
                {acting === "confirm" ? "Confirming…" : "✓ Confirm Booking"}
              </button>
            )}
            {(booking.status === "REQUEST") && (
              <button
                onClick={() => doAction("reject")}
                disabled={acting !== null}
                className="w-full py-2.5 rounded-xl bg-[#FFF3E0] text-[#E65100] font-semibold text-sm hover:bg-[#FFE0B2] transition-colors disabled:opacity-50"
              >
                {acting === "reject" ? "Rejecting…" : "✗ Reject Request"}
              </button>
            )}
            {["PENDING", "CONFIRMED", "REQUEST"].includes(booking.status) && (
              <button
                onClick={() => doAction("cancel")}
                disabled={acting !== null}
                className="w-full py-2.5 rounded-xl bg-[#FFEBEE] text-[#C62828] font-semibold text-sm hover:bg-[#FFCDD2] transition-colors disabled:opacity-50"
              >
                {acting === "cancel" ? "Cancelling…" : "Cancel Booking"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminBookingsPage() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch]             = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage]                 = useState(1);
  const [selected, setSelected]         = useState<Booking | null>(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  // Build URL
  const buildUrl = useCallback(() => {
    const p = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
    if (statusFilter !== "all") p.set("status", statusFilter);
    if (debouncedSearch) p.set("search", debouncedSearch);
    return `/api/admin/bookings?${p}`;
  }, [page, statusFilter, debouncedSearch]);

  const { data, error, mutate, isLoading } = useSWR(buildUrl, (url) => fetch(url).then((r) => r.json()), {
    refreshInterval: 8000,
    revalidateOnFocus: true,
  });

  const bookings: Booking[] = data?.data ?? [];
  const total: number       = data?.pagination?.total ?? 0;
  const totalPages          = Math.ceil(total / PAGE_SIZE);

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleAction = async (id: string, action: "confirm" | "cancel" | "reject") => {
    const endpoint =
      action === "confirm" ? `/api/bookings/${id}/confirm`
      : action === "reject" ? `/api/bookings/${id}/reject`
      : `/api/bookings/${id}/cancel`;

    await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
    mutate();
  };

  // ── Stats from current page ────────────────────────────────────────────────
  const stats = {
    pending:   bookings.filter((b) => b.status === "PENDING" || b.status === "REQUEST").length,
    confirmed: bookings.filter((b) => b.status === "CONFIRMED").length,
    cancelled: bookings.filter((b) => b.status === "CANCELLED" || b.status === "REJECTED").length,
  };

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#1A1A2E]">All Bookings</h1>
            <p className="text-sm text-[#4A4A6A] mt-1">
              {isLoading ? "Loading…" : `${total.toLocaleString()} total bookings across the platform`}
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
        {!isLoading && bookings.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Pending / Review", value: stats.pending,   bg: "#FFF3E0", text: "#E65100" },
              { label: "Confirmed",        value: stats.confirmed, bg: "#E8F5E9", text: "#2E7D32" },
              { label: "Cancelled",        value: stats.cancelled, bg: "#FFEBEE", text: "#C62828" },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-2xl border border-[#E8E0D0] p-3 text-center shadow-[0_2px_8px_rgba(114,74,106,0.06)]">
                <p className="text-xl font-bold" style={{ color: s.text }}>{s.value}</p>
                <p className="text-[11px] text-[#8A8AAA] mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Search + Status filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="flex items-center gap-2 flex-1 border border-[#E8E0D0] rounded-xl bg-white px-4 h-10">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8A8AAA" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              className="flex-1 bg-transparent outline-none text-sm placeholder:text-[#8A8AAA] text-[#1A1A2E]"
              placeholder="Search customer, email, or service…"
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
        </div>

        {/* Status pills */}
        <div className="flex gap-2 flex-wrap -mt-2">
          {STATUSES.map((s) => {
            const cfg = STATUS_CONFIG[s];
            return (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); setPage(1); }}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  statusFilter === s
                    ? "bg-[#724A6A] text-white shadow-[0_2px_8px_rgba(114,74,106,0.3)]"
                    : "bg-[#FFFBE9] text-[#4A4A6A] border border-[#E8E0D0] hover:border-[#724A6A] hover:text-[#724A6A]"
                }`}
              >
                {cfg?.label ?? "All"}
              </button>
            );
          })}
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-[#E8E0D0] shadow-[0_2px_12px_rgba(114,74,106,0.06)] overflow-hidden">
          {isLoading ? (
            <div className="p-4 flex flex-col gap-3">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
            </div>
          ) : error ? (
            <div className="text-center py-16">
              <span className="text-4xl mb-3 block">⚠️</span>
              <p className="text-sm text-[#C62828] mb-3">Failed to load bookings.</p>
              <button onClick={() => mutate()} className="btn-primary text-sm py-2 px-4">Retry</button>
            </div>
          ) : bookings.length === 0 ? (
            <div className="text-center py-16">
              <span className="text-4xl mb-3 block">📅</span>
              <p className="text-sm text-[#8A8AAA]">
                {search || statusFilter !== "all" ? "No bookings match your filters." : "No bookings yet."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#E8E0D0] bg-[#FFFBE9]">
                    {["Customer", "Service", "Organiser", "Date & Time", "Status", "Payment", "Created", ""].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[#8A8AAA] uppercase tracking-wide whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0EAD8]">
                  {bookings.map((b) => (
                    <tr
                      key={b.id}
                      className="hover:bg-[#FFFBE9] transition-colors cursor-pointer"
                      onClick={() => setSelected(b)}
                    >
                      <td className="px-4 py-3">
                        <p className="text-sm font-semibold text-[#1A1A2E] whitespace-nowrap">{b.customer?.name ?? "—"}</p>
                        <p className="text-xs text-[#8A8AAA]">{b.customer?.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-[#1A1A2E] whitespace-nowrap">{b.service?.title ?? "—"}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-[#4A4A6A] whitespace-nowrap">{b.service?.organiser?.name ?? "—"}</p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="text-sm text-[#1A1A2E]">{b.slot?.start ? fmtDate(b.slot.start) : "—"}</p>
                        <p className="text-xs text-[#8A8AAA]">{b.slot?.start ? fmtTime(b.slot.start) : ""}</p>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={b.status} />
                      </td>
                      <td className="px-4 py-3">
                        <PaymentBadge status={b.paymentStatus} />
                      </td>
                      <td className="px-4 py-3 text-xs text-[#8A8AAA] whitespace-nowrap">
                        {fmtDate(b.createdAt)}
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-1">
                          {(b.status === "PENDING" || b.status === "REQUEST") && (
                            <button
                              onClick={() => handleAction(b.id, "confirm")}
                              className="text-[10px] font-bold text-[#2E7D32] px-2 py-1 rounded-lg bg-[#E8F5E9] hover:bg-[#C8E6C9] transition-colors whitespace-nowrap"
                            >
                              ✓ Confirm
                            </button>
                          )}
                          {b.status === "REQUEST" && (
                            <button
                              onClick={() => handleAction(b.id, "reject")}
                              className="text-[10px] font-bold text-[#E65100] px-2 py-1 rounded-lg bg-[#FFF3E0] hover:bg-[#FFE0B2] transition-colors"
                            >
                              ✗ Reject
                            </button>
                          )}
                          {["PENDING", "CONFIRMED", "REQUEST"].includes(b.status) && (
                            <button
                              onClick={() => handleAction(b.id, "cancel")}
                              className="text-[10px] font-bold text-[#C62828] px-2 py-1 rounded-lg bg-[#FFEBEE] hover:bg-[#FFCDD2] transition-colors"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
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
                <span className="text-xs text-[#8A8AAA]">
                  {page} / {totalPages}
                </span>
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
        <BookingDrawer
          booking={selected}
          onClose={() => setSelected(null)}
          onAction={handleAction}
        />
      )}
    </AdminLayout>
  );
}
