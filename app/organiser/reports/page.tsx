"use client";

import { useState } from "react";
import useSWR from "swr";
import OrganiserLayout from "@/components/organiser/OrganiserLayout";
import { REPORT_REFRESH_MS, jsonFetcher } from "@/lib/realtime";

function Skeleton({ className }: { className?: string }) {
  return <div className={`skeleton rounded-xl ${className}`} />;
}

interface KPIs {
  totalRevenue: number;
  totalBookings: number;
  avgPerBooking: number;
  completionRate: number;
  confirmedBookings: number;
  cancelledBookings: number;
}

interface MonthlyPoint { month: string; bookings: number; revenue: number }
interface PeakHour    { time: string; pct: number }
interface ServiceStat {
  id: string; title: string; icon: string | null;
  bookings: number; revenue: number; currency: string;
  completionRate: number; isPublished: boolean;
}

export default function OrganiserReportsPage() {
  const [days, setDays]               = useState(30);

  const { data: responseData, isLoading } = useSWR<{ data?: {
    kpis: KPIs;
    monthlyData: MonthlyPoint[];
    peakHours: PeakHour[];
    serviceStats: ServiceStat[];
  } }>(
    `/api/organiser/reports?days=${days}`,
    jsonFetcher,
    { refreshInterval: REPORT_REFRESH_MS, revalidateOnFocus: true }
  );
  const kpis = responseData?.data?.kpis ?? null;
  const monthly = responseData?.data?.monthlyData ?? [];
  const peakHours = responseData?.data?.peakHours ?? [];
  const services = responseData?.data?.serviceStats ?? [];

  const maxBookings = Math.max(...monthly.map((d) => d.bookings), 1);

  const fmt = (n: number, currency = "INR") => {
    const sym = currency === "INR" ? "₹" : currency;
    return `${sym}${n.toLocaleString("en-IN")}`;
  };

  return (
    <OrganiserLayout>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#1A1A2E]">Reports &amp; Insights</h1>
            <p className="text-sm text-[#4A4A6A] mt-1">Real-time analytics for your services</p>
          </div>
          <div className="flex gap-2">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  days === d
                    ? "bg-[#724A6A] text-white"
                    : "bg-[#FFFBE9] text-[#4A4A6A] border border-[#E8E0D0] hover:border-[#724A6A]"
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)
            : [
                {
                  label: "Total Revenue",
                  value: fmt(kpis?.totalRevenue ?? 0),
                  icon: "💰", accent: "#D4A017", bg: "#FFF8E1",
                },
                {
                  label: "Total Bookings",
                  value: String(kpis?.totalBookings ?? 0),
                  icon: "📅", accent: "#724A6A", bg: "#F5EDF4",
                },
                {
                  label: "Avg. per Booking",
                  value: fmt(kpis?.avgPerBooking ?? 0),
                  icon: "📊", accent: "#0277BD", bg: "#E1F5FE",
                },
                {
                  label: "Completion Rate",
                  value: `${kpis?.completionRate ?? 0}%`,
                  icon: "✅", accent: "#2E7D32", bg: "#E8F5E9",
                },
              ].map((s, i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl border border-[#E8E0D0] p-4 shadow-[0_2px_8px_rgba(114,74,106,0.06)]"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
                      style={{ background: s.bg }}
                    >
                      {s.icon}
                    </div>
                  </div>
                  <p className="text-xl font-bold" style={{ color: s.accent }}>{s.value}</p>
                  <p className="text-xs text-[#8A8AAA] mt-0.5">{s.label}</p>
                </div>
              ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Monthly bookings bar chart */}
          <div className="bg-white rounded-2xl border border-[#E8E0D0] p-5 shadow-[0_2px_12px_rgba(114,74,106,0.06)]">
            <h2 className="font-semibold text-[#1A1A2E] mb-5">Monthly Bookings</h2>
            {isLoading ? (
              <Skeleton className="h-40" />
            ) : monthly.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-sm text-[#8A8AAA]">
                No data yet
              </div>
            ) : (
              <div className="flex items-end gap-3 h-40">
                {monthly.map((d) => (
                  <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs font-bold text-[#724A6A]">{d.bookings}</span>
                    <div
                      className="w-full rounded-t-lg bg-gradient-to-t from-[#724A6A] to-[#9B6B92] transition-all"
                      style={{ height: `${(d.bookings / maxBookings) * 120}px`, minHeight: d.bookings > 0 ? "4px" : "0" }}
                    />
                    <span className="text-xs text-[#8A8AAA]">{d.month}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Peak booking hours */}
          <div className="bg-white rounded-2xl border border-[#E8E0D0] p-5 shadow-[0_2px_12px_rgba(114,74,106,0.06)]">
            <h2 className="font-semibold text-[#1A1A2E] mb-5">Peak Booking Hours</h2>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8" />)}
              </div>
            ) : peakHours.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-sm text-[#8A8AAA]">
                No booking data yet
              </div>
            ) : (
              <div className="space-y-3">
                {peakHours.map((h) => (
                  <div key={h.time}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[#4A4A6A] font-medium">{h.time}</span>
                      <span className="text-[#8A8AAA]">{h.pct}%</span>
                    </div>
                    <div className="h-2 bg-[#F0EAD8] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#724A6A] to-[#D4A017] transition-all"
                        style={{ width: `${h.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Service performance table */}
          <div className="bg-white rounded-2xl border border-[#E8E0D0] p-5 shadow-[0_2px_12px_rgba(114,74,106,0.06)] lg:col-span-2">
            <h2 className="font-semibold text-[#1A1A2E] mb-5">Service Performance</h2>
            {isLoading ? (
              <div className="flex flex-col gap-3">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
              </div>
            ) : services.length === 0 ? (
              <div className="text-center py-10 text-sm text-[#8A8AAA]">
                No services yet. <a href="/organiser/services/new" className="text-[#724A6A] hover:underline">Create one →</a>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#E8E0D0]">
                      {["Service", "Bookings", "Revenue", "Completion Rate", "Status"].map((h) => (
                        <th
                          key={h}
                          className="text-left pb-3 text-xs font-semibold text-[#8A8AAA] uppercase tracking-wide"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0EAD8]">
                    {services.map((s) => (
                      <tr key={s.id} className="hover:bg-[#FFFBE9] transition-colors">
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-lg w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden shrink-0 bg-[#F5EDF4]">
                              {s.icon?.startsWith('/') || s.icon?.startsWith('http') ? (
                                <img src={s.icon} alt={s.title} className="w-full h-full object-cover" />
                              ) : (
                                s.icon ?? "📅"
                              )}
                            </span>
                            <span className="text-sm font-medium text-[#1A1A2E]">{s.title}</span>
                          </div>
                        </td>
                        <td className="py-3 text-sm text-[#4A4A6A]">{s.bookings}</td>
                        <td className="py-3 text-sm font-semibold text-[#724A6A]">
                          {fmt(s.revenue, s.currency)}
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-[#F0EAD8] rounded-full max-w-[80px]">
                              <div
                                className="h-full bg-[#2E7D32] rounded-full"
                                style={{ width: `${s.completionRate}%` }}
                              />
                            </div>
                            <span className="text-xs text-[#4A4A6A]">{s.completionRate}%</span>
                          </div>
                        </td>
                        <td className="py-3">
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </OrganiserLayout>
  );
}
