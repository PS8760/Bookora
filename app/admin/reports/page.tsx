"use client";

import { useState } from "react";
import useSWR from "swr";
import AdminLayout from "@/components/admin/AdminLayout";
import { REPORT_REFRESH_MS, jsonFetcher } from "@/lib/realtime";

function Skeleton({ className }: { className?: string }) {
  return <div className={`skeleton rounded-xl ${className}`} />;
}

interface AdminReportsResponse {
  data?: {
    overview?: {
      totalBookings: number;
      pending: number;
      confirmed: number;
      cancelled: number;
      completed: number;
      rescheduled?: number;
      noShow: number;
      revenue: number;
    };
    serviceStats?: {
      serviceId: string;
      title: string;
      confirmedBookings: number;
      pendingBookings: number;
      totalBookings: number;
    }[];
    topOrganisers?: {
      id: string;
      name: string;
      serviceCount: number;
      totalBookings: number;
    }[];
    dailyTrends?: {
      date: string;
      totalBookings: number;
      confirmedBookings: number;
    }[];
  };
}

export default function AdminReportsPage() {
  const [days, setDays] = useState(30);
  const { data: responseData, isLoading } = useSWR<AdminReportsResponse>(
    `/api/admin/reports?days=${days}`,
    jsonFetcher,
    { refreshInterval: REPORT_REFRESH_MS, revalidateOnFocus: true }
  );
  const data = responseData?.data;

  const overview = data?.overview;

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#1A1A2E]">Reports & Analytics</h1>
            <p className="text-sm text-[#4A4A6A] mt-1">Platform-wide performance overview</p>
          </div>
          <div className="flex gap-2">
            {[7, 30, 90].map((d) => (
              <button key={d} onClick={() => setDays(d)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${days === d
                  ? "bg-[#724A6A] text-white"
                  : "bg-[#FFFBE9] text-[#4A4A6A] border border-[#E8E0D0] hover:border-[#724A6A]"
                  }`}>
                {d}d
              </button>
            ))}
          </div>
        </div>

        {/* Overview stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)
            : [
                { label: "Total Bookings",  value: overview?.totalBookings ?? 0,  icon: "📅", accent: "#724A6A", bg: "#F5EDF4" },
                { label: "Confirmed",       value: overview?.confirmed ?? 0,       icon: "✅", accent: "#2E7D32", bg: "#E8F5E9" },
                { label: "Cancelled",       value: overview?.cancelled ?? 0,       icon: "❌", accent: "#C62828", bg: "#FFEBEE" },
                { label: "Revenue (₹)",     value: `₹${(overview?.revenue ?? 0).toLocaleString("en-IN")}`, icon: "💰", accent: "#D4A017", bg: "#FFF8E1" },
              ].map((s, i) => (
                <div key={i} className="bg-white rounded-2xl border border-[#E8E0D0] p-4 shadow-[0_2px_8px_rgba(114,74,106,0.06)]">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-3" style={{ background: s.bg }}>{s.icon}</div>
                  <p className="text-2xl font-bold" style={{ color: s.accent }}>{s.value}</p>
                  <p className="text-xs font-semibold text-[#1A1A2E] mt-0.5">{s.label}</p>
                </div>
              ))}
        </div>

        {/* Status breakdown */}
        {!isLoading && overview && (
          <div className="bg-white rounded-2xl border border-[#E8E0D0] p-5 shadow-[0_2px_8px_rgba(114,74,106,0.06)]">
            <h2 className="font-semibold text-[#1A1A2E] mb-4">Booking Status Breakdown</h2>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {[
                { label: "Pending",     value: overview.pending,     bg: "#FFF3E0", text: "#E65100" },
                { label: "Confirmed",   value: overview.confirmed,   bg: "#E8F5E9", text: "#2E7D32" },
                { label: "Cancelled",   value: overview.cancelled,   bg: "#FFEBEE", text: "#C62828" },
                { label: "Completed",   value: overview.completed,   bg: "#E1F5FE", text: "#0277BD" },
                { label: "Rescheduled", value: overview.rescheduled ?? 0, bg: "#F3E5F5", text: "#6A1B9A" },
                { label: "No Show",     value: overview.noShow,      bg: "#ECEFF1", text: "#546E7A" },
              ].map((s) => (
                <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: s.bg }}>
                  <p className="text-xl font-bold" style={{ color: s.text }}>{s.value}</p>
                  <p className="text-[11px] font-medium mt-0.5" style={{ color: s.text }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Top services */}
          <div className="bg-white rounded-2xl border border-[#E8E0D0] shadow-[0_2px_12px_rgba(114,74,106,0.06)] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E8E0D0]">
              <h2 className="font-semibold text-[#1A1A2E]">Top Services by Bookings</h2>
            </div>
            {isLoading ? (
              <div className="p-4 flex flex-col gap-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
            ) : (
              <div className="divide-y divide-[#F0EAD8]">
                {(data?.serviceStats ?? []).slice(0, 8).map((s, i) => (
                  <div key={s.serviceId} className="flex items-center gap-3 px-5 py-3">
                    <span className="text-sm font-bold text-[#8A8AAA] w-5">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#1A1A2E] truncate">{s.title}</p>
                      <div className="flex gap-2 mt-0.5">
                        <span className="text-[11px] text-[#2E7D32]">{s.confirmedBookings} confirmed</span>
                        <span className="text-[11px] text-[#E65100]">{s.pendingBookings} pending</span>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-[#724A6A]">{s.totalBookings}</span>
                  </div>
                ))}
                {(data?.serviceStats ?? []).length === 0 && (
                  <p className="text-sm text-[#8A8AAA] text-center py-8">No data yet</p>
                )}
              </div>
            )}
          </div>

          {/* Top organisers */}
          <div className="bg-white rounded-2xl border border-[#E8E0D0] shadow-[0_2px_12px_rgba(114,74,106,0.06)] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E8E0D0]">
              <h2 className="font-semibold text-[#1A1A2E]">Top Organisers</h2>
            </div>
            {isLoading ? (
              <div className="p-4 flex flex-col gap-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
            ) : (
              <div className="divide-y divide-[#F0EAD8]">
                {(data?.topOrganisers ?? []).map((o, i) => (
                  <div key={o.id} className="flex items-center gap-3 px-5 py-3">
                    <span className="text-sm font-bold text-[#8A8AAA] w-5">{i + 1}</span>
                    <div className="w-8 h-8 rounded-full bg-[#F5EDF4] flex items-center justify-center text-xs font-bold text-[#724A6A] flex-shrink-0">
                      {o.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#1A1A2E] truncate">{o.name}</p>
                      <p className="text-xs text-[#8A8AAA]">{o.serviceCount} service{o.serviceCount !== 1 ? "s" : ""}</p>
                    </div>
                    <span className="text-sm font-bold text-[#724A6A]">{o.totalBookings} bookings</span>
                  </div>
                ))}
                {(data?.topOrganisers ?? []).length === 0 && (
                  <p className="text-sm text-[#8A8AAA] text-center py-8">No organisers yet</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Daily trends */}
        {!isLoading && (data?.dailyTrends ?? []).length > 0 && (
          <div className="bg-white rounded-2xl border border-[#E8E0D0] p-5 shadow-[0_2px_8px_rgba(114,74,106,0.06)]">
            <h2 className="font-semibold text-[#1A1A2E] mb-4">Daily Booking Trend (last {days} days)</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#E8E0D0]">
                    <th className="text-left py-2 px-3 text-[#8A8AAA] font-semibold">Date</th>
                    <th className="text-right py-2 px-3 text-[#8A8AAA] font-semibold">Total</th>
                    <th className="text-right py-2 px-3 text-[#8A8AAA] font-semibold">Confirmed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0EAD8]">
                  {(data?.dailyTrends ?? []).slice(-14).reverse().map((d) => (
                    <tr key={d.date} className="hover:bg-[#FFFBE9]">
                      <td className="py-2 px-3 text-[#4A4A6A]">
                        {new Date(d.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td className="py-2 px-3 text-right font-semibold text-[#724A6A]">{d.totalBookings}</td>
                      <td className="py-2 px-3 text-right text-[#2E7D32]">{d.confirmedBookings}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
