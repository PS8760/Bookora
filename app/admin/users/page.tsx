"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import AdminLayout from "@/components/admin/AdminLayout";
import { LIVE_REFRESH_MS, jsonFetcher } from "@/lib/realtime";

const roleConfig: Record<string, { bg: string; text: string }> = {
  customer:  { bg: "#FFFBE9", text: "#724A6A" },
  organiser: { bg: "#F5EDF4", text: "#724A6A" },
  admin:     { bg: "#FFF8E1", text: "#D4A017" },
};

function Skeleton({ className }: { className?: string }) {
  return <div className={`skeleton rounded-xl ${className}`} />;
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
}

interface UsersResponse {
  data?: AdminUser[];
  pagination?: { total?: number };
}

interface UserDetail {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  timezone: string;
  emailVerified: boolean;
  createdAt: string;
  _count: {
    customerBookings: number;
    organisedServices: number;
  };
}

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [drawerError, setDrawerError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "customer",
    timezone: "UTC",
    isActive: true,
  });

  const usersUrl = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (roleFilter !== "all") params.set("role", roleFilter);
    if (search.trim()) params.set("search", search.trim());
    return `/api/admin/users?${params}`;
  }, [page, roleFilter, search]);

  const { data, isLoading, mutate } = useSWR<UsersResponse>(usersUrl, jsonFetcher, {
    refreshInterval: LIVE_REFRESH_MS,
    revalidateOnFocus: true,
  });

  const users: AdminUser[] = data?.data ?? [];
  const total = data?.pagination?.total ?? 0;

  const handleToggleActive = async (userId: string, isActive: boolean) => {
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => null);
      alert(j?.error?.message ?? "Unable to update user status.");
      return;
    }
    mutate();
  };

  const handleRoleChange = async (userId: string, role: string) => {
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => null);
      alert(j?.error?.message ?? "Unable to change role.");
      return;
    }
    mutate();
  };

  const openUserEditor = async (userId: string) => {
    setEditing(true);
    setDrawerError(null);
    const res = await fetch(`/api/admin/users/${userId}`);
    const j = await res.json().catch(() => null);
    if (!res.ok || !j?.data) {
      setDrawerError(j?.error?.message ?? "Unable to load user profile.");
      setEditing(false);
      return;
    }
    const user: UserDetail = j.data;
    setSelectedUser(user);
    setForm({
      name: user.name ?? "",
      email: user.email ?? "",
      role: user.role ?? "customer",
      timezone: user.timezone ?? "UTC",
      isActive: user.isActive,
    });
    setEditing(false);
  };

  const closeEditor = () => {
    setSelectedUser(null);
    setDrawerError(null);
  };

  const saveUserProfile = async () => {
    if (!selectedUser) return;
    setSaving(true);
    setDrawerError(null);
    const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const j = await res.json().catch(() => null);
    if (!res.ok) {
      setDrawerError(j?.error?.message ?? "Unable to save user profile.");
      setSaving(false);
      return;
    }
    setSaving(false);
    closeEditor();
    mutate();
  };

  const deleteUser = async () => {
    if (!selectedUser) return;
    if (!confirm(`Delete ${selectedUser.name}'s account?`)) return;
    setSaving(true);
    setDrawerError(null);
    const res = await fetch(`/api/admin/users/${selectedUser.id}`, { method: "DELETE" });
    const j = await res.json().catch(() => null);
    if (!res.ok) {
      setDrawerError(j?.error?.message ?? "Unable to delete user.");
      setSaving(false);
      return;
    }
    setSaving(false);
    closeEditor();
    mutate();
  };

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#1A1A2E]">User Management</h1>
            <p className="text-sm text-[#4A4A6A] mt-1">{total} total users</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-2 flex-1 border border-[#E8E0D0] rounded-xl bg-white px-3 h-10">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8A8AAA" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input className="flex-1 bg-transparent outline-none text-sm placeholder:text-[#8A8AAA]"
              placeholder="Search by name or email..."
              value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <div className="flex gap-2 flex-wrap">
            {["all", "customer", "organiser", "admin"].map((r) => (
              <button key={r} onClick={() => { setRoleFilter(r); setPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${roleFilter === r
                  ? "bg-[#724A6A] text-white"
                  : "bg-[#FFFBE9] text-[#4A4A6A] border border-[#E8E0D0] hover:border-[#724A6A]"
                  }`}>
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-[#E8E0D0] shadow-[0_2px_12px_rgba(114,74,106,0.06)] overflow-hidden">
          {isLoading ? (
            <div className="p-4 flex flex-col gap-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
          ) : users.length === 0 ? (
            <div className="text-center py-16">
              <span className="text-4xl mb-3 block">👤</span>
              <p className="text-sm text-[#8A8AAA]">No users found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#E8E0D0] bg-[#FFFBE9]">
                    {["User", "Role", "Status", "Joined", "Actions"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[#8A8AAA] uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0EAD8]">
                  {users.map((u) => {
                    const r = roleConfig[u.role] ?? roleConfig.customer;
                    return (
                      <tr key={u.id} className="hover:bg-[#FFFBE9] transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {u.image ? (
                              <img src={u.image} alt={u.name} className="w-8 h-8 rounded-full object-cover" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-[#F5EDF4] flex items-center justify-center text-xs font-bold text-[#724A6A]">
                                {u.name?.split(" ").map((n: string) => n[0]).join("") ?? "?"}
                              </div>
                            )}
                            <div>
                              <p className="text-sm font-semibold text-[#1A1A2E]">{u.name}</p>
                              <p className="text-xs text-[#8A8AAA]">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="badge text-[11px]" style={{ background: r.bg, color: r.text }}>{u.role}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`badge text-[11px] ${u.isActive ? "bg-[#E8F5E9] text-[#2E7D32]" : "bg-[#FFEBEE] text-[#C62828]"}`}>
                            {u.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-[#4A4A6A]">
                          {new Date(u.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1 items-center">
                            <select
                              defaultValue={u.role}
                              onChange={(e) => handleRoleChange(u.id, e.target.value)}
                              className="text-xs border border-[#E8E0D0] rounded-lg px-2 py-1 bg-[#FFFBE9] text-[#4A4A6A] cursor-pointer outline-none focus:border-[#724A6A]"
                            >
                              <option value="customer">customer</option>
                              <option value="organiser">organiser</option>
                              <option value="admin">admin</option>
                            </select>
                            <button
                              onClick={() => handleToggleActive(u.id, u.isActive)}
                              className={`text-xs font-semibold px-2 py-1 rounded-lg transition-colors ${u.isActive
                                ? "bg-[#FFEBEE] text-[#C62828] hover:bg-[#FFCDD2]"
                                : "bg-[#E8F5E9] text-[#2E7D32] hover:bg-[#C8E6C9]"
                                }`}>
                              {u.isActive ? "Deactivate" : "Activate"}
                            </button>
                            <button
                              onClick={() => openUserEditor(u.id)}
                              className="text-xs font-semibold px-2 py-1 rounded-lg bg-[#FFFBE9] border border-[#E8E0D0] text-[#724A6A] hover:bg-[#F5EDF4] transition-colors"
                            >
                              Edit Profile
                            </button>
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
          {total > 20 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-[#E8E0D0]">
              <p className="text-xs text-[#8A8AAA]">Showing {Math.min((page - 1) * 20 + 1, total)}–{Math.min(page * 20, total)} of {total}</p>
              <div className="flex gap-2">
                <button disabled={page === 1} onClick={() => setPage(page - 1)}
                  className="px-3 py-1.5 text-xs rounded-lg border border-[#E8E0D0] disabled:opacity-40 hover:border-[#724A6A] transition-colors">
                  ← Prev
                </button>
                <button disabled={page * 20 >= total} onClick={() => setPage(page + 1)}
                  className="px-3 py-1.5 text-xs rounded-lg border border-[#E8E0D0] disabled:opacity-40 hover:border-[#724A6A] transition-colors">
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedUser && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={closeEditor} />
          <div className="w-full max-w-md bg-white shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E0D0] sticky top-0 bg-white">
              <div>
                <h2 className="font-bold text-[#1A1A2E]">Edit User Profile</h2>
                <p className="text-xs text-[#8A8AAA] mt-0.5">{selectedUser.id.slice(0, 8)}...</p>
              </div>
              <button onClick={closeEditor} className="text-[#8A8AAA] hover:text-[#724A6A]">✕</button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <div className="bg-[#FFFBE9] rounded-xl p-3 border border-[#E8E0D0] text-xs text-[#4A4A6A]">
                Bookings: {selectedUser._count.customerBookings} · Services: {selectedUser._count.organisedServices} · Verified: {selectedUser.emailVerified ? "Yes" : "No"}
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#1A1A2E] mb-1.5">Name</label>
                <input className="input-base" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#1A1A2E] mb-1.5">Email</label>
                <input className="input-base" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-[#1A1A2E] mb-1.5">Role</label>
                  <select className="input-base" value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}>
                    <option value="customer">customer</option>
                    <option value="organiser">organiser</option>
                    <option value="admin">admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#1A1A2E] mb-1.5">Timezone</label>
                  <input className="input-base" value={form.timezone} onChange={(e) => setForm((p) => ({ ...p, timezone: e.target.value }))} />
                </div>
              </div>
              <label className="inline-flex items-center gap-2 text-sm text-[#1A1A2E]">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))} />
                User Active
              </label>
              {drawerError && (
                <div className="px-3 py-2 rounded-lg bg-[#FFEBEE] text-[#C62828] text-sm">{drawerError}</div>
              )}
              <div className="flex gap-2 pt-2 border-t border-[#E8E0D0]">
                <button
                  onClick={saveUserProfile}
                  disabled={saving || editing}
                  className="btn-primary text-sm py-2.5 px-4 rounded-xl disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
                <button
                  onClick={deleteUser}
                  disabled={saving || editing}
                  className="text-sm font-semibold text-[#C62828] border border-[#FFCDD2] px-4 py-2.5 rounded-xl hover:bg-[#FFEBEE] transition-colors disabled:opacity-60"
                >
                  Delete User
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {editing && (
        <div className="fixed bottom-4 right-4 bg-white border border-[#E8E0D0] rounded-xl px-4 py-2 text-sm text-[#4A4A6A] shadow">
          Loading user profile...
        </div>
      )}
    </AdminLayout>
  );
}
