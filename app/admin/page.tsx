"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import AdminLayout from "@/components/admin/AdminLayout";

function Skeleton({ className }: { className?: string }) {
  return <div className={`skeleton rounded-xl ${className}`} />;
}

const roleConfig: Record<string, { bg: string; text: string }> = {
  customer:  { bg: "#E1F5FE", text: "#0277BD" },
  organiser: { bg: "#F5EDF4", text: "#724A6A" },
  admin:     { bg: "#FFF8E1", text: "#D4A017" },
};

const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
  confirmed: { label: "Confirmed", bg: "#E8F5E9", text: "#2E7D32" },
  pending:   { label: "Pending",   bg: "#FFF3E0", text: "#E65100" },
  cancelled: { label: "Cancelled", bg: "#FFEBEE", text: "#C62828" },
  completed: { label: "Completed", bg: "#E1F5FE", text: "#0277BD" },
};

interface AdminData {
  stats: {
    totalUsers: number; weekUsers: number; totalOrganisers: number;
    totalServices: number; publishedServices: number;
    totalBookings: number; monthBookings: number;
    pendingBookings: number; confirmedBookings: number; cancelledBookings: number;
    revenue: number;
  };
  recentUsers: any[];
  recentBookings: any[];
  user: { name: string; email: string };
}

export default function AdminDashboard() {
  const fetcher = (url: string) => fetch(url).then((res) => res.json());
  const { data: responseData, error, mutate } = useSWR("/api/dashboard/admin", fetcher, { refreshInterval: 5000 });
  const loading = !responseData && !error;
  const data = responseData?.data;

  const refresh = () => mutate();

  const handleToggleActive = async (userId: string, isActive: boolean) => {
    await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    refresh();
  };

  const handleRoleChange = async (userId: string, role: string) => {
    await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    refresh();
  };

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6">
        <div>
          {loading ? <Skeleton className="h-8 w-56 mb-2" /> : (
            <h1 className="text-2xl font-bold text-[#1A1A2E]">Admin Dashboard</h1>
          )}
          <p className="text-sm text-[#4A4A6A] mt-1">Platform-wide monitoring and control</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)
            : [
                { label: "Total Users",    value: data?.stats.totalUsers ?? 0,    change: `+${data?.stats.weekUsers ?? 0} this week`, icon: "👥", accent: "#724A6A", bg: "#F5EDF4" },
                { label: "Organisers",     value: data?.stats.totalOrganisers ?? 0, change: `${data?.stats.publishedServices ?? 0} services published`, icon: "🏢", accent: "#0277BD", bg: "#E1F5FE" },
                { label: "Total Bookings", value: data?.stats.totalBookings ?? 0, change: `+${data?.stats.monthBookings ?? 0} this month`, icon: "📅", accent: "#2E7D32", bg: "#E8F5E9" },
                { label: "Revenue",        value: `₹${(data?.stats.revenue ?? 0).toLocaleString("en-IN")}`, change: `${data?.stats.confirmedBookings ?? 0} confirmed`, icon: "💰", accent: "#D4A017", bg: "#FFF8E1" },
              ].map((s, i) => (
                <div key={i} className="bg-white rounded-2xl border border-[#E8E0D0] p-4 shadow-[0_2px_8px_rgba(114,74,106,0.06)]">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: s.bg }}>{s.icon}</div>
                  </div>
                  <p className="text-2xl font-bold" style={{ color: s.accent }}>{s.value}</p>
                  <p className="text-xs font-semibold text-[#1A1A2E] mt-0.5">{s.label}</p>
                  <p className="text-xs text-[#2E7D32] mt-0.5">{s.change}</p>
                </div>
              ))}
        </div>

        {/* Booking status breakdown */}
        {!loading && (
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Pending",   value: data?.stats.pendingBookings ?? 0,   bg: "#FFF3E0", text: "#E65100" },
              { label: "Confirmed", value: data?.stats.confirmedBookings ?? 0, bg: "#E8F5E9", text: "#2E7D32" },
              { label: "Cancelled", value: data?.stats.cancelledBookings ?? 0, bg: "#FFEBEE", text: "#C62828" },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-2xl border border-[#E8E0D0] p-4 text-center shadow-[0_2px_8px_rgba(114,74,106,0.06)]">
                <p className="text-2xl font-bold" style={{ color: s.text }}>{s.value}</p>
                <p className="text-xs font-medium text-[#8A8AAA] mt-1">{s.label} Bookings</p>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Recent users */}
          <div className="bg-white rounded-2xl border border-[#E8E0D0] shadow-[0_2px_12px_rgba(114,74,106,0.06)] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8E0D0]">
              <h2 className="font-semibold text-[#1A1A2E]">Recent Users</h2>
              <Link href="/admin/users" className="text-xs text-[#724A6A] hover:underline font-medium">View all</Link>
            </div>
            {loading ? (
              <div className="p-4 flex flex-col gap-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
            ) : (
              <div className="divide-y divide-[#F0EAD8]">
                {(data?.recentUsers ?? []).map((u) => {
                  const r = roleConfig[u.role] ?? roleConfig.customer;
                  return (
                    <div key={u.id} className="flex items-center gap-3 p-4 hover:bg-[#FFFBE9] transition-colors">
                      {u.image ? (
                        <img src={u.image} alt={u.name} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-[#F5EDF4] flex items-center justify-center text-xs font-bold text-[#724A6A] flex-shrink-0">
                          {u.name?.split(" ").map((n: string) => n[0]).join("") ?? "?"}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#1A1A2E] truncate">{u.name}</p>
                        <p className="text-xs text-[#8A8AAA] truncate">{u.email}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="badge text-[10px]" style={{ background: r.bg, color: r.text }}>{u.role}</span>
                        <div className="flex gap-1">
                          <select
                            defaultValue={u.role}
                            onChange={(e) => handleRoleChange(u.id, e.target.value)}
                            className="text-[10px] border border-[#E8E0D0] rounded px-1 py-0.5 bg-[#FFFBE9] text-[#4A4A6A] cursor-pointer outline-none"
                          >
                            <option value="customer">customer</option>
                            <option value="organiser">organiser</option>
                            <option value="admin">admin</option>
                          </select>
                          <button
                            onClick={() => handleToggleActive(u.id, u.isActive)}
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded transition-colors ${u.isActive
                              ? "bg-[#FFEBEE] text-[#C62828] hover:bg-[#FFCDD2]"
                              : "bg-[#E8F5E9] text-[#2E7D32] hover:bg-[#C8E6C9]"
                              }`}>
                            {u.isActive ? "Deactivate" : "Activate"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent bookings */}
          <div className="bg-white rounded-2xl border border-[#E8E0D0] shadow-[0_2px_12px_rgba(114,74,106,0.06)] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8E0D0]">
              <h2 className="font-semibold text-[#1A1A2E]">Recent Bookings</h2>
              <Link href="/admin/bookings" className="text-xs text-[#724A6A] hover:underline font-medium">View all</Link>
            </div>
            {loading ? (
              <div className="p-4 flex flex-col gap-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
            ) : data?.recentBookings.length === 0 ? (
              <div className="text-center py-10"><p className="text-sm text-[#8A8AAA]">No bookings yet</p></div>
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
                        <p className="text-sm font-semibold text-[#1A1A2E] truncate">{b.customer?.name}</p>
                        <p className="text-xs text-[#8A8AAA] truncate">{b.service?.title} · {b.date}</p>
                      </div>
                      <span className="badge text-[10px]" style={{ background: s.bg, color: s.text }}>{s.label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
