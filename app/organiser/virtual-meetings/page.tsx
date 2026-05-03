"use client";

import { useState } from "react";
import useSWR from "swr";
import OrganiserLayout from "@/components/organiser/OrganiserLayout";
import { Video, Clock, Wifi, CheckCircle2, XCircle, Users } from "lucide-react";

const jsonFetcher = (url: string) => fetch(url).then((r) => r.json());

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; icon: React.ReactNode }> = {
  SCHEDULED: { label: "Scheduled", bg: "#FFF3E0", text: "#E65100", icon: <Clock size={12} /> },
  LIVE:      { label: "Live",      bg: "#E8F5E9", text: "#2E7D32", icon: <Wifi size={12} /> },
  COMPLETED: { label: "Completed", bg: "#E1F5FE", text: "#0277BD", icon: <CheckCircle2 size={12} /> },
  CANCELLED: { label: "Cancelled", bg: "#FFEBEE", text: "#C62828", icon: <XCircle size={12} /> },
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

const STATUSES = ["all", "SCHEDULED", "LIVE", "COMPLETED", "CANCELLED"];

export default function OrganiserVirtualMeetingsPage() {
  const [statusFilter, setStatusFilter] = useState("all");

  const url = statusFilter === "all"
    ? "/api/organiser/virtual-meetings"
    : `/api/organiser/virtual-meetings?status=${statusFilter}`;

  const { data, error, mutate, isLoading } = useSWR(url, jsonFetcher, {
    refreshInterval: 10000,
    revalidateOnFocus: true,
  });

  const meetings = data?.data ?? [];
  const total: number = data?.pagination?.total ?? 0;

  return (
    <OrganiserLayout>
      <div className="flex flex-col gap-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F5EDF4] flex items-center justify-center">
              <Video size={20} className="text-[#724A6A]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#1A1A2E]">My Virtual Meetings</h1>
              <p className="text-sm text-[#4A4A6A] mt-0.5">
                {isLoading ? "Loading…" : `${total} total meetings`}
              </p>
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

        {/* Stats strip */}
        {!isLoading && (
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Scheduled", value: meetings.filter((m: any) => m.status === "SCHEDULED").length, ...STATUS_CONFIG.SCHEDULED },
              { label: "Live Now",  value: meetings.filter((m: any) => m.status === "LIVE").length,      ...STATUS_CONFIG.LIVE },
              { label: "Completed", value: meetings.filter((m: any) => m.status === "COMPLETED").length, ...STATUS_CONFIG.COMPLETED },
              { label: "Cancelled", value: meetings.filter((m: any) => m.status === "CANCELLED").length, ...STATUS_CONFIG.CANCELLED },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-2xl border border-[#E8E0D0] p-3 text-center shadow-[0_2px_8px_rgba(114,74,106,0.06)]">
                <p className="text-xl font-bold" style={{ color: s.text }}>{s.value}</p>
                <p className="text-xs text-[#8A8AAA] mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Status pills */}
        <div className="flex gap-2 flex-wrap">
          {STATUSES.map((s) => {
            const cfg = STATUS_CONFIG[s];
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
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

        {/* Cards */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40" />)}
          </div>
        ) : error ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-[#E8E0D0]">
            <p className="text-sm text-[#C62828] mb-3">Failed to load meetings.</p>
            <button onClick={() => mutate()} className="btn-primary text-sm py-2 px-4">Retry</button>
          </div>
        ) : meetings.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-[#E8E0D0]">
            <Video size={48} className="mx-auto text-[#D4B8CF] mb-4" />
            <p className="font-semibold text-[#1A1A2E] mb-1">No virtual meetings yet</p>
            <p className="text-sm text-[#8A8AAA]">
              Enable virtual meetings on your services to start hosting online sessions.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {meetings.map((m: any) => {
              const now = new Date();
              const start = new Date(m.startTime);
              const end = new Date(m.endTime);
              const buffer = 10 * 60 * 1000;
              const isActive = now >= new Date(start.getTime() - buffer) && now <= end;
              const isFinished = now > end;
              const cfg = STATUS_CONFIG[m.status] ?? STATUS_CONFIG.SCHEDULED;

              return (
                <div key={m.id} className={`bg-white rounded-2xl border-2 shadow-[0_2px_12px_rgba(114,74,106,0.06)] p-5 flex flex-col gap-4 transition-all ${
                  m.status === "LIVE" ? "border-[#2E7D32] shadow-[0_0_20px_rgba(46,125,50,0.15)]" : "border-[#E8E0D0]"
                }`}>
                  {/* Top row */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold`} style={{ background: cfg.bg, color: cfg.text }}>
                        {cfg.icon} {cfg.label}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#F5EDF4] text-[#724A6A] border border-[#D4B8CF]">
                        {m.platform === "MEET" ? "🎥 Google Meet" : "💻 Zoom"}
                      </span>
                    </div>
                    {m.status === "LIVE" && (
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2E7D32] opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#2E7D32]"></span>
                      </span>
                    )}
                  </div>

                  {/* Service */}
                  <div>
                    <p className="font-bold text-[#1A1A2E] text-sm truncate">{m.service?.title}</p>
                  </div>

                  {/* Customer */}
                  <div className="flex items-center gap-3 p-3 bg-[#FFFBE9] rounded-xl border border-[#E8E0D0]">
                    <div className="w-8 h-8 rounded-full bg-[#F5EDF4] flex items-center justify-center text-xs font-bold text-[#724A6A] flex-shrink-0">
                      {m.customer?.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2) ?? "?"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#1A1A2E] truncate">{m.customer?.name}</p>
                      <p className="text-xs text-[#8A8AAA] truncate">{m.customer?.email}</p>
                    </div>
                  </div>

                  {/* Time */}
                  <div className="flex items-center gap-2 text-sm text-[#4A4A6A]">
                    <Clock size={14} className="text-[#8A8AAA] flex-shrink-0" />
                    <span>{fmtDate(m.startTime)} · {fmtTime(m.startTime)} – {fmtTime(m.endTime)}</span>
                  </div>

                  {/* Action */}
                  {!isFinished && m.meetingLink ? (
                    <a
                      href={m.meetingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
                        isActive
                          ? "bg-[#724A6A] text-white hover:bg-[#5A3A54] shadow-[0_4px_12px_rgba(114,74,106,0.3)]"
                          : "bg-[#F5EDF4] text-[#724A6A] border-2 border-[#D4B8CF] hover:border-[#724A6A]"
                      }`}
                    >
                      <Video size={16} />
                      {isActive ? "Start Meeting" : `Starts at ${fmtTime(m.startTime)}`}
                    </a>
                  ) : isFinished ? (
                    <div className="w-full flex items-center justify-center py-2.5 rounded-xl text-sm text-[#8A8AAA] bg-[#ECEFF1]">
                      <CheckCircle2 size={14} className="mr-2" /> Meeting Ended
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </OrganiserLayout>
  );
}
