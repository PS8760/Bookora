"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { CalendarDays, Clock, CheckCircle2, XCircle, Inbox, Calendar, Video, ExternalLink } from "lucide-react";
import { dashboardSWRConfig, jsonFetcher } from "@/lib/realtime";
import VoiceAssistant from "@/voice/components/VoiceAssistant";

const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
  confirmed: { label: "Confirmed", bg: "#E8F5E9", text: "#2E7D32" },
  pending:   { label: "Pending",   bg: "#FFF3E0", text: "#E65100" },
  completed: { label: "Completed", bg: "#E1F5FE", text: "#0277BD" },
  cancelled: { label: "Cancelled", bg: "#FFEBEE", text: "#C62828" },
  no_show:   { label: "No Show",   bg: "#F3E5F5", text: "#724A6A" },
};

const iconColors = ["#E1F5FE","#F3E5F5","#FFF3E0","#E8F5E9","#FFF8E1","#FCE4EC"];

interface DashData {
  stats: { total: number; upcoming: number; completed: number; cancelled: number };
  upcomingBookings: any[];
  pastBookings: any[];
  user: { name: string; email: string; image?: string };
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`skeleton rounded-xl ${className}`} />;
}

export default function DashboardPage() {
  const { data: responseData, error, mutate } = useSWR<{ data: DashData }>(
    "/api/dashboard/customer",
    jsonFetcher,
    dashboardSWRConfig
  );
  const loading = !responseData && !error;
  const data = responseData?.data;

  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [voiceOpen, setVoiceOpen] = useState(false);

  const handleCancel = async (bookingId: string) => {
    if (!confirm("Cancel this booking?")) return;
    setCancelling(bookingId);
    await fetch(`/api/bookings/${bookingId}/cancel`, { method: "POST" });
    mutate(); // instantly trigger swr revalidation
    setCancelling(null);
  };

  const firstName = data?.user?.name?.split(" ")[0] ?? "there";
  const bookings = tab === "upcoming" ? data?.upcomingBookings ?? [] : data?.pastBookings ?? [];

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            {loading ? (
              <Skeleton className="h-8 w-56 mb-2" />
            ) : (
              <h1 className="text-2xl font-bold text-[#1A1A2E]">
                Welcome back, {firstName} 👋
              </h1>
            )}
            <p className="text-sm text-[#4A4A6A] mt-1">
              {loading ? "" : `You have ${data?.stats.upcoming ?? 0} upcoming appointment${data?.stats.upcoming !== 1 ? "s" : ""}`}
            </p>
          </div>
          <Link href="/services" className="btn-primary text-sm py-2.5 px-5 self-start sm:self-auto">
            + Book Appointment
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24" />
              ))
            : [
                { label: "Total Bookings", value: data?.stats.total ?? 0, icon: <CalendarDays size={24} />, color: "#F5EDF4", accent: "#724A6A" },
                { label: "Upcoming",       value: data?.stats.upcoming ?? 0, icon: <Clock size={24} />, color: "#FFF3E0", accent: "#E65100" },
                { label: "Completed",      value: data?.stats.completed ?? 0, icon: <CheckCircle2 size={24} />, color: "#E8F5E9", accent: "#2E7D32" },
                { label: "Cancelled",      value: data?.stats.cancelled ?? 0, icon: <XCircle size={24} />, color: "#FFEBEE", accent: "#C62828" },
              ].map((s, i) => (
                <div key={i} className="bg-white rounded-2xl border border-[#E8E0D0] p-4 shadow-[0_2px_8px_rgba(114,74,106,0.06)]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xl">{s.icon}</span>
                    <span className="text-2xl font-bold" style={{ color: s.accent }}>{s.value}</span>
                  </div>
                  <p className="text-xs text-[#8A8AAA] font-medium">{s.label}</p>
                </div>
              ))}
        </div>

        {/* Bookings */}
        <div className="bg-white rounded-2xl border border-[#E8E0D0] shadow-[0_2px_12px_rgba(114,74,106,0.06)] overflow-hidden">
          <div className="flex border-b border-[#E8E0D0]">
            {(["upcoming", "past"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 py-3.5 text-sm font-semibold capitalize transition-colors ${tab === t
                  ? "text-[#724A6A] border-b-2 border-[#724A6A] bg-[#F5EDF4]/50"
                  : "text-[#8A8AAA] hover:text-[#4A4A6A]"
                  }`}>
                {t} {!loading && `(${t === "upcoming" ? data?.upcomingBookings.length ?? 0 : data?.pastBookings.length ?? 0})`}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="p-4 flex flex-col gap-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
            </div>
          ) : bookings.length === 0 ? (
            <div className="text-center py-16">
              <span className="text-5xl mb-3 block text-[#8A8AAA] flex justify-center"><Inbox size={48} /></span>
              <p className="font-semibold text-[#1A1A2E] mb-1">No {tab} bookings</p>
              <p className="text-sm text-[#8A8AAA]">
                {tab === "upcoming" ? (
                  <Link href="/services" className="text-[#724A6A] hover:underline">Browse services to book one →</Link>
                ) : "Your past bookings will appear here"}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#F0EAD8]">
              {bookings.map((b: any, idx: number) => {
                const s = statusConfig[b.status] ?? statusConfig.pending;
                return (
                  <div key={b.id} className="flex items-center gap-4 p-4 hover:bg-[#FFFBE9] transition-colors">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0 overflow-hidden"
                      style={{ background: iconColors[idx % iconColors.length] }}>
                      {b.icon?.startsWith('/') || b.icon?.startsWith('http') ? (
                        <img src={b.icon} alt="Icon" className="w-full h-full object-cover" />
                      ) : b.icon && b.icon !== "📅" ? (
                        <span className="text-xl">{b.icon}</span>
                      ) : b.rawDate ? (() => {
                        const d = new Date(b.rawDate);
                        const month = d.toLocaleString('default', { month: 'short' });
                        const day = d.getDate();
                        return (
                          <div className="flex flex-col items-center justify-center leading-tight">
                            <span className="text-[9px] font-bold text-[#C62828] uppercase tracking-tighter">{month}</span>
                            <span className="text-lg font-bold text-[#1A1A2E] -mt-0.5">{day}</span>
                          </div>
                        );
                      })() : (
                        <Calendar size={20} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-[#1A1A2E] truncate">{b.service}</p>
                      <p className="text-xs text-[#8A8AAA]">{b.category}</p>
                    </div>
                    <div className="text-right hidden sm:block">
                      <p className="text-sm font-medium text-[#4A4A6A]">{b.date}</p>
                      <p className="text-xs text-[#8A8AAA]">{b.time}</p>
                      <p className="text-xs text-[#8A8AAA] mt-1 flex items-center gap-1 justify-end">
                        {b.selectedMode === "VIRTUAL" ? "💻 Virtual" : b.selectedMode === "PHYSICAL" ? "📍 Physical" : ""}
                      </p>
                    </div>
                    <span className="badge text-[11px] flex-shrink-0" style={{ background: s.bg, color: s.text }}>
                      {s.label}
                    </span>
                    {tab === "upcoming" && b.virtualMeeting && (
                      <div className="flex flex-col items-end gap-1">
                        {(() => {
                          const now = new Date();
                          const start = new Date(b.virtualMeeting.startTime);
                          const end = new Date(b.virtualMeeting.endTime);
                          const buffer = 10 * 60 * 1000; // 10 mins
                          const isActive = now >= new Date(start.getTime() - buffer) && now <= end;
                          const isFinished = now > end;

                          if (isFinished) return <span className="text-[10px] text-[#8A8AAA]">Meeting Ended</span>;
                          
                          if (isActive) return (
                            <a 
                              href={b.virtualMeeting.link} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2E7D32] text-white rounded-lg text-xs font-bold hover:bg-[#1B5E20] transition-all shadow-sm animate-pulse"
                            >
                              <Video size={14} />
                              Join Now
                            </a>
                          );

                          return (
                            <div className="flex items-center gap-1 text-[10px] text-[#E65100] font-medium bg-[#FFF3E0] px-2 py-0.5 rounded-md">
                              <Video size={10} />
                              Starts {new Date(start.getTime() - buffer).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          );
                        })()}
                      </div>
                    )}
                    {b.selectedMode === "PHYSICAL" && b.venueSnapshot && (
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[10px] text-[#4A4A6A] bg-[#F5EDF4] px-2 py-1 rounded-md border border-[#D4B8CF] line-clamp-1 max-w-[150px]">
                          📍 {b.venueSnapshot}
                        </span>
                      </div>
                    )}
                    {tab === "upcoming" && b.status !== "cancelled" && (
                      <div className="flex flex-col gap-2">
                        <Link
                          href={`/dashboard/messages?bookingId=${b.id}`}
                          className="text-xs text-center text-[#724A6A] font-bold px-2 py-1.5 rounded-lg border border-[#724A6A] hover:bg-[#F5EDF4] transition-colors flex-shrink-0"
                        >
                          Message
                        </Link>
                        <div className="flex gap-2 justify-end">
                          <Link
                            href={`/book/${b.serviceId}?reschedule=${b.id}`}
                            className="text-xs text-center text-[#2E7D32] font-medium px-2 py-1 rounded-lg hover:bg-[#E8F5E9] transition-colors flex-shrink-0"
                          >
                            Reschedule
                          </Link>
                          <button
                            onClick={() => handleCancel(b.id)}
                            disabled={cancelling === b.id}
                            className="text-xs text-[#C62828] font-medium px-2 py-1 rounded-lg hover:bg-[#FFEBEE] transition-colors flex-shrink-0 disabled:opacity-50"
                          >
                            {cancelling === b.id ? "..." : "Cancel"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      {/* Voice FAB — always visible above layout */}
      <button
        onClick={() => setVoiceOpen(true)}
        title="Voice Assistant — book appointments hands-free"
        style={{
          position: 'fixed', bottom: 28, right: 28,
          width: 60, height: 60, borderRadius: '50%',
          background: 'linear-gradient(135deg, #9B59B6, #724A6A)',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 6px 24px rgba(114,74,106,0.45), 0 0 0 4px rgba(114,74,106,0.12)',
          zIndex: 9999,
          transition: 'transform 0.15s, box-shadow 0.15s',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.1)';
          (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 32px rgba(114,74,106,0.6), 0 0 0 6px rgba(114,74,106,0.18)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
          (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 24px rgba(114,74,106,0.45), 0 0 0 4px rgba(114,74,106,0.12)';
        }}
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="2" width="6" height="12" rx="3" />
          <path d="M5 10a7 7 0 0 0 14 0" />
          <line x1="12" y1="19" x2="12" y2="22" />
          <line x1="9" y1="22" x2="15" y2="22" />
        </svg>
      </button>

      {voiceOpen && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setVoiceOpen(false); }}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
          }}
        >
          <VoiceAssistant role="customer" onSuccess={() => { setVoiceOpen(false); mutate(); }} />
        </div>
      )}
    </DashboardLayout>
  );
}

