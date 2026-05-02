"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import OrganiserLayout from "@/components/organiser/OrganiserLayout";
import { dashboardSWRConfig, jsonFetcher } from "@/lib/realtime";
import ChatWindow from "@/components/chat/ChatWindow";

const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
  confirmed: { label: "Confirmed", bg: "#E8F5E9", text: "#2E7D32" },
  pending:   { label: "Pending",   bg: "#FFF3E0", text: "#E65100" },
  cancelled: { label: "Cancelled", bg: "#FFEBEE", text: "#C62828" },
  completed: { label: "Completed", bg: "#E1F5FE", text: "#0277BD" },
};

function Skeleton({ className }: { className?: string }) {
  return <div className={`skeleton rounded-xl ${className}`} />;
}

interface OrgData {
  stats: {
    totalBookings: number; monthBookings: number; pendingBookings: number;
    revenue: number; totalServices: number; publishedServices: number;
  };
  services: any[];
  recentBookings: any[];
  user: { name: string; email: string };
}

export default function OrganiserDashboard() {
  const { data: responseData, error, mutate } = useSWR(
    "/api/dashboard/organiser",
    jsonFetcher,
    dashboardSWRConfig
  );
  const loading = !responseData && !error;
  const data = responseData?.data;

  const [chatBookingId, setChatBookingId] = useState<string | null>(null);

  const handleConfirm = async (bookingId: string) => {
    await fetch(`/api/bookings/${bookingId}/confirm`, { method: "POST" });
    mutate();
  };

  const handleReject = async (bookingId: string) => {
    await fetch(`/api/bookings/${bookingId}/reject`, { method: "POST" });
    mutate();
  };

  const firstName = data?.user?.name?.split(" ")[0] ?? "there";

  return (
    <OrganiserLayout>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            {loading ? <Skeleton className="h-8 w-64 mb-2" /> : (
              <h1 className="text-2xl font-bold text-[#1A1A2E]">
                Welcome, {firstName} 👋
              </h1>
            )}
            <p className="text-sm text-[#4A4A6A] mt-1">Manage your services and bookings</p>
          </div>
          <Link href="/organiser/services/new" className="btn-primary text-sm py-2.5 px-5 self-start sm:self-auto">
            + New Service
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)
            : [
                { label: "Total Bookings", value: data?.stats.totalBookings ?? 0, icon: "📅", accent: "#724A6A", bg: "#F5EDF4" },
                { label: "This Month",     value: data?.stats.monthBookings ?? 0,  icon: "📈", accent: "#2E7D32", bg: "#E8F5E9" },
                { label: "Revenue",        value: `₹${(data?.stats.revenue ?? 0).toLocaleString("en-IN")}`, icon: "💰", accent: "#D4A017", bg: "#FFF8E1" },
                { label: "Active Services",value: data?.stats.publishedServices ?? 0, icon: "🏢", accent: "#0277BD", bg: "#E1F5FE" },
              ].map((s, i) => (
                <div key={i} className="bg-white rounded-2xl border border-[#E8E0D0] p-4 shadow-[0_2px_8px_rgba(114,74,106,0.06)]">
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg" style={{ background: s.bg }}>{s.icon}</div>
                    <span className="text-2xl font-bold" style={{ color: s.accent }}>{s.value}</span>
                  </div>
                  <p className="text-xs text-[#8A8AAA] font-medium">{s.label}</p>
                </div>
              ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Services */}
          <div className="bg-white rounded-2xl border border-[#E8E0D0] shadow-[0_2px_12px_rgba(114,74,106,0.06)] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8E0D0]">
              <h2 className="font-semibold text-[#1A1A2E]">My Services</h2>
              <Link href="/organiser/services" className="text-xs text-[#724A6A] hover:underline font-medium">View all</Link>
            </div>
            {loading ? (
              <div className="p-4 flex flex-col gap-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
            ) : data?.services.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-sm text-[#8A8AAA] mb-3">No services yet</p>
                <Link href="/organiser/services/new" className="btn-primary text-xs py-2 px-4">Create your first service</Link>
              </div>
            ) : (
              <div className="divide-y divide-[#F0EAD8]">
                {(data?.services ?? []).slice(0, 5).map((s) => (
                  <div key={s.id} className="flex items-center gap-3 p-4 hover:bg-[#FFFBE9] transition-colors">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 bg-[#F5EDF4]">
                      {s.icon || "📅"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-[#1A1A2E] truncate">{s.title}</p>
                      <p className="text-xs text-[#8A8AAA]">{s.bookings} bookings · {s.availableSlots} slots</p>
                    </div>
                    <span className={`badge text-[10px] ${s.status === "published" ? "bg-[#E8F5E9] text-[#2E7D32]" : "bg-[#FFF3E0] text-[#E65100]"}`}>
                      {s.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent bookings */}
          <div className="bg-white rounded-2xl border border-[#E8E0D0] shadow-[0_2px_12px_rgba(114,74,106,0.06)] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8E0D0]">
              <h2 className="font-semibold text-[#1A1A2E]">Recent Bookings</h2>
              <Link href="/organiser/bookings" className="text-xs text-[#724A6A] hover:underline font-medium">View all</Link>
            </div>
            {loading ? (
              <div className="p-4 flex flex-col gap-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
            ) : data?.recentBookings.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-sm text-[#8A8AAA]">No bookings yet</p>
              </div>
            ) : (
              <div className="divide-y divide-[#F0EAD8]">
                {(data?.recentBookings ?? []).map((b) => {
                  const s = statusConfig[b.status] ?? statusConfig.pending;
                  return (
                    <div key={b.id} className="flex items-center gap-3 p-4 hover:bg-[#FFFBE9] transition-colors">
                      <div className="w-9 h-9 rounded-full bg-[#F5EDF4] flex items-center justify-center text-xs font-bold text-[#724A6A] flex-shrink-0">
                        {b.customer?.name?.split(" ").map((n: string) => n[0]).join("") ?? "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-[#1A1A2E] truncate">{b.customer?.name}</p>
                        <p className="text-xs text-[#8A8AAA] truncate">{b.service?.title} · {b.date} {b.time}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="badge text-[10px]" style={{ background: s.bg, color: s.text }}>{s.label}</span>
                        <div className="flex gap-1">
                          {b.status === "pending" && (
                            <>
                              <button onClick={() => handleConfirm(b.id)}
                                className="text-[10px] font-bold text-[#2E7D32] px-1.5 py-0.5 rounded bg-[#E8F5E9] hover:bg-[#C8E6C9] transition-colors">✓</button>
                              <button onClick={() => handleReject(b.id)}
                                className="text-[10px] font-bold text-[#C62828] px-1.5 py-0.5 rounded bg-[#FFEBEE] hover:bg-[#FFCDD2] transition-colors">✗</button>
                            </>
                          )}
                          <button onClick={() => setChatBookingId(b.id)}
                            className="text-[10px] font-bold text-[#724A6A] px-1.5 py-0.5 rounded bg-[#F5EDF4] hover:bg-[#E8D5E4] transition-colors">💬</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chat Overlay */}
      {chatBookingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md animate-in zoom-in-95 duration-200">
            <ChatWindow 
              bookingId={chatBookingId}
              currentUserId={responseData?.data?.user?.id}
              onClose={() => setChatBookingId(null)}
            />
          </div>
        </div>
      )}

    </OrganiserLayout>
  );
}
