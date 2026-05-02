"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { signOutAndRedirect } from "@/lib/logout-client";
import BookoraLogo from "@/components/BookoraLogo";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: "⊞", exact: true },
  { href: "/admin/users", label: "Users", icon: "👥", exact: false },
  { href: "/admin/bookings", label: "All Bookings", icon: "📅", exact: false },
  { href: "/admin/services", label: "Services", icon: "🏢", exact: false },
  { href: "/admin/reports", label: "Reports", icon: "📊", exact: false },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { data: session } = useSession();

  const user = session?.user as { name?: string; email?: string; image?: string } | undefined;
  const initials = user?.name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() ?? "A";

  const handleSignOut = async () => {
    await signOutAndRedirect(router);
  };

  return (
    <div className="min-h-screen bg-[#FFFBE9] flex flex-col">
      <header className="h-24 bg-[#1A1A2E] flex items-center px-4 gap-4 sticky top-0 z-40">
        <button className="lg:hidden p-2 rounded-lg hover:bg-white/10 text-white" onClick={() => setSidebarOpen(!sidebarOpen)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <Link href="/" className="flex items-center gap-2">
          <BookoraLogo height={96} linked={false} className="brightness-0 invert" />
        </Link>
        <span className="badge bg-[#D4A017]/20 text-[#D4A017] border border-[#D4A017]/30 text-[10px]">Admin</span>
        <div className="flex-1" />
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-xs font-semibold text-white leading-tight">{user?.name ?? "..."}</span>
            <span className="text-[10px] text-white/50">{user?.email}</span>
          </div>
          {user?.image ? (
            <img src={user.image} alt={user.name} className="w-8 h-8 rounded-full object-cover border-2 border-white/20" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-[#724A6A] flex items-center justify-center text-white text-xs font-bold">
              {initials}
            </div>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {sidebarOpen && <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />}

        <aside className={`fixed lg:static top-24 bottom-0 left-0 z-40 w-56 bg-[#1A1A2E] flex flex-col py-4 transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
          <nav className="flex flex-col gap-1 px-3 flex-1">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${item.exact ? pathname === item.href : pathname.startsWith(item.href)
                  ? "bg-[#724A6A] text-white"
                  : "text-white/60 hover:bg-white/10 hover:text-white"
                  }`}>
                <span>{item.icon}</span>{item.label}
              </Link>
            ))}
          </nav>
          <div className="px-3 pt-3 border-t border-white/10 flex flex-col gap-1">
            <Link href="/" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/60 hover:bg-white/10 hover:text-white transition-colors">
              ← Back to Site
            </Link>
            <button onClick={handleSignOut}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-white/10 w-full transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Sign Out
            </button>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto p-5 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
