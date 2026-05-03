"use client";

import { useState, useCallback } from "react";
import useSWR from "swr";
import AdminLayout from "@/components/admin/AdminLayout";
import { Video, Monitor, Clock, CheckCircle2, XCircle, Wifi, AlertTriangle } from "lucide-react";

const jsonFetcher = (url: string) => fetch(url).then((r) => r.json());

const PLATFORM_CONFIG: Record<string, { label: string; icon: string; bg: string; text: string; border: string }> = {
  MEET: { label: "Google Meet", icon: "🎥", bg: "#E8F5E9", text: "#2E7D32", border: "#A5D6A7" },
  ZOOM: { label: "Zoom",        icon: "💻", bg: "#E3F2FD", text: "#1565C0", border: "#90CAF9" },
  Offline: { label: "Offline",  icon: "📍", bg: "#ECEFF1", text: "#546E7A", border: "#CFD8DC" },
};

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; icon: React.ReactNode }> = {
  SCHEDULED: { label: "Scheduled", bg: "#FFF3E0", text: "#E65100",  icon: <Clock size={12} /> },
  LIVE:      { label: "Live",      bg: "#E8F5E9", text: "#2E7D32",  icon: <Wifi size={12} /> },
  COMPLETED: { label: "Completed", bg: "#E1F5FE", text: "#0277BD",  icon: <CheckCircle2 size={12} /> },
  CANCELLED: { label: "Cancelled", bg: "#FFEBEE", text: "#C62828",  icon: <XCircle size={12} /> },
  MISSED:    { label: "Missed",    bg: "#F3E5F5", text: "#6A1B9A",  icon: <AlertTriangle size={12} /> },
  "N/A":     { label: "N/A",       bg: "#ECEFF1", text: "#546E7A",  icon: <Monitor size={12} /> },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`skeleton rounded-xl ${className}`} />;
}

function PlatformBadge({ platform }: { platform: string }) {
  const cfg = PLATFORM_CONFIG[platform] ?? PLATFORM_CONFIG.Offline;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border"
      style={{ background: cfg.bg, color: cfg.text, borderColor: cfg.border }}
    >
      {cfg.icon} {cfg.label}
    </span>
  );
}

function MeetingStatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG["N/A"];
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold"
      style={{ background: cfg.bg, color: cfg.text }}
    >
      {cfg.icon} {cfg.label}
    </span>
  );
}

const STATUSES = ["all", "SCHEDULED", "LIVE", "COMPLETED", "CANCELLED", "MISSED"];
const PLATFORMS = ["all", "MEET", "ZOOM"];
const PAGE_SIZE = 20;

export default function AdminVirtualMeetingsPage() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const buildUrl = useCallback(() => {
    const p = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
    if (statusFilter !== "all") p.set("status", statusFilter);
    if (platformFilter !== "all") p.set("platform", platformFilter);
    if (search.trim()) p.set("search", search.trim());
    return `/api/admin/virtual-meetings?${p}`;
  }, [page, statusFilter, platformFilter, search]);

  const { data, error, mutate, isLoading } = useSWR(buildUrl, jsonFetcher, {
    refreshInterval: 10000,
    revalidateOnFocus: true,
  });

  const meetings = data?.data ?? [];
  const total: number = data?.pagination?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const stats = {
    scheduled: meetings.filter((m: any) => m.status === "SCHEDULED").length,
    live:      meetings.filter((m: any) => m.status === "LIVE").length,
    completed: meetings.filter((m: any) => m.status === "COMPLETED").length,
    cancelled: meetings.filter((m: any) => m.status === "CANCELLED").length,
  };

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#F5EDF4] flex items-center justify-center">
                <Video size={20} className="text-[#724A6A]" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-[#1A1A2E]">Virtual Meetings</h1>
                <p className="text-sm text-[#4A4A6A] mt-0.5">
                  {isLoading ? "Loading…" : `${total.toLocaleString()} total across the platform`}
                </p>
              </div>
            </div>
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

        {/* Stats */}
        {!isLoading && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "Scheduled", value: stats.scheduled, ...STATUS_CONFIG.SCHEDULED },
              { label: "Live Now",  value: stats.live,      ...STATUS_CONFIG.LIVE },
              { label: "Completed", value: stats.completed, ...STATUS_CONFIG.COMPLETED },
              { label: "Cancelled", value: stats.cancelled, ...STATUS_CONFIG.CANCELLED },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-2xl border border-[#E8E0D0] p-4 text-center shadow-[0_2px_8px_rgba(114,74,106,0.06)]">
                <p className="text-2xl font-bold" style={{ color: s.text }}>{s.value}</p>
                <p className="text-xs text-[#8A8AAA] mt-1 font-medium">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="flex items-center gap-2 flex-1 border border-[#E8E0D0] rounded-xl bg-white px-4 h-10">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8A8AAA" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              className="flex-1 bg-transparent outline-none text-sm placeholder:text-[#8A8AAA] text-[#1A1A2E]"
              placeholder="Search customer, organiser, or service…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
            {search && (
              <button onClick={() => setSearch("")} className="text-[#8A8AAA] hover:text-[#724A6A]">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            )}
          </div>
          {/* Platform filter */}
          <select
            className="h-10 border border-[#E8E0D0] rounded-xl bg-white px-3 text-sm text-[#4A4A6A] cursor-pointer outline-none hover:border-[#724A6A] transition-colors"
            value={platformFilter}
            onChange={(e) => { setPlatformFilter(e.target.value); setPage(1); }}
          >
            <option value="all">All Platforms</option>
            <option value="MEET">Google Meet</option>
            <option value="ZOOM">Zoom</option>
          </select>
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
                {s === "all" ? "All Meetings" : (cfg?.label ?? s)}
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
              <Video size={40} className="mx-auto text-[#8A8AAA] mb-3" />
              <p className="text-sm text-[#C62828] mb-3">Failed to load meetings.</p>
              <button onClick={() => mutate()} className="btn-primary text-sm py-2 px-4">Retry</button>
            </div>
          ) : meetings.length === 0 ? (
            <div className="text-center py-16">
              <Video size={40} className="mx-auto text-[#8A8AAA] mb-3" />
              <p className="font-semibold text-[#1A1A2E] mb-1">No virtual meetings found</p>
              <p className="text-sm text-[#8A8AAA]">
                {search || statusFilter !== "all" ? "No meetings match your filters." : "Virtual meetings will appear here once organisers enable them on their services."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#E8E0D0] bg-[#FFFBE9]">
                    {["Customer", "Organiser", "Service", "Date", "Time", "Platform", "Meeting Status", "Booking Status", "Actions"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[#8A8AAA] uppercase tracking-wide whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0EAD8]">
                  {meetings.map((m: any) => {
                    const now = new Date();
                    const start = new Date(m.startTime);
                    const end = new Date(m.endTime);
                    const buffer = 10 * 60 * 1000;
                    const canJoin = now >= new Date(start.getTime() - buffer) && now <= end;

                    return (
                      <tr key={m.id} className="hover:bg-[#FFFBE9] transition-colors">
                        <td className="px-4 py-3">
                          <p className="text-sm font-semibold text-[#1A1A2E] whitespace-nowrap">{m.customer?.name ?? "—"}</p>
                          <p className="text-xs text-[#8A8AAA]">{m.customer?.email}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-[#4A4A6A] whitespace-nowrap">{m.organiser?.name ?? "—"}</p>
                          <p className="text-xs text-[#8A8AAA]">{m.organiser?.email}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-[#1A1A2E] whitespace-nowrap max-w-[160px] truncate">{m.service?.title ?? "—"}</p>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <p className="text-sm text-[#1A1A2E]">{fmtDate(m.startTime)}</p>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <p className="text-sm text-[#1A1A2E]">{fmtTime(m.startTime)}</p>
                          <p className="text-xs text-[#8A8AAA]">→ {fmtTime(m.endTime)}</p>
                        </td>
                        <td className="px-4 py-3">
                          <PlatformBadge platform={m.platform} />
                        </td>
                        <td className="px-4 py-3">
                          <MeetingStatusBadge status={m.status} />
                        </td>
                        <td className="px-4 py-3">
                          <span className={`badge text-[10px] font-semibold ${
                            m.bookingStatus === "CONFIRMED" ? "bg-[#E8F5E9] text-[#2E7D32]" :
                            m.bookingStatus === "CANCELLED" ? "bg-[#FFEBEE] text-[#C62828]" :
                            "bg-[#FFF3E0] text-[#E65100]"
                          }`}>
                            {m.bookingStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {m.meetingLink && (
                            <a
                              href={m.meetingLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                                canJoin
                                  ? "bg-[#724A6A] text-white hover:bg-[#5A3A54] shadow-sm"
                                  : "bg-[#F5EDF4] text-[#724A6A] border border-[#D4B8CF] hover:bg-[#EAD9E8]"
                              }`}
                            >
                              <Video size={12} />
                              {canJoin ? "Join Now" : "View Link"}
                            </a>
                          )}
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
    </AdminLayout>
  );
}
