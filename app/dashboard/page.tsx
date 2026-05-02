"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { CalendarDays, Clock, CheckCircle2, XCircle, Inbox, Calendar } from "lucide-react";
import { dashboardSWRConfig, jsonFetcher } from "@/lib/realtime";
import ChatWindow from "@/components/chat/ChatWindow";

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
  const { data: responseData, error, mutate } = useSWR(
    "/api/dashboard/customer",
    jsonFetcher,
    dashboardSWRConfig
  );
  const loading = !responseData && !error;
  const data = responseData?.data;

  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [chatBookingId, setChatBookingId] = useState<string | null>(null);

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
              {bookings.map((b, idx) => {
                const s = statusConfig[b.status] ?? statusConfig.pending;
                return (
                  <div key={b.id} className="flex items-center gap-4 p-4 hover:bg-[#FFFBE9] transition-colors">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                      style={{ background: iconColors[idx % iconColors.length] }}>
                      {b.icon || <Calendar size={20} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-[#1A1A2E] truncate">{b.service}</p>
                      <p className="text-xs text-[#8A8AAA]">{b.category}</p>
                    </div>
                    <div className="text-right hidden sm:block">
                      <p className="text-sm font-medium text-[#4A4A6A]">{b.date}</p>
                      <p className="text-xs text-[#8A8AAA]">{b.time}</p>
                    </div>
                    <span className="badge text-[11px] flex-shrink-0" style={{ background: s.bg, color: s.text }}>
                      {s.label}
                    </span>
                    {tab === "upcoming" && b.status !== "cancelled" && (
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => handleCancel(b.id)}
                          disabled={cancelling === b.id}
                          className="text-xs text-[#C62828] font-medium px-2 py-1 rounded-lg hover:bg-[#FFEBEE] transition-colors flex-shrink-0 disabled:opacity-50"
                        >
                          {cancelling === b.id ? "..." : "Cancel"}
                        </button>
                        <Link
                          href={`/book/${b.serviceId}?reschedule=${b.id}`}
                          className="text-xs text-center text-[#2E7D32] font-medium px-2 py-1 rounded-lg hover:bg-[#E8F5E9] transition-colors flex-shrink-0"
                        >
                          Reschedule
                        </Link>
                        <button
                          onClick={() => setChatBookingId(b.id)}
                          className="text-xs text-center text-[#724A6A] font-medium px-2 py-1 rounded-lg bg-[#F5EDF4] hover:bg-[#E8D5E4] transition-colors flex-shrink-0"
                        >
                          Chat
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Chat Overlay */}
      {chatBookingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md animate-in zoom-in-95 duration-200">
            <ChatWindow 
              bookingId={chatBookingId}
              currentUserId={data?.user?.id}
              onClose={() => setChatBookingId(null)}
            />
          </div>
        </div>
      )}

    </DashboardLayout>
  );
}
