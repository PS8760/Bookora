"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { signOutAndRedirect } from "@/lib/logout-client";
import BookoraLogo from "@/components/BookoraLogo";

import { LayoutDashboard, Users, Calendar, Building2, BarChart3, MessageSquare } from "lucide-react";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: <LayoutDashboard size={20} />, exact: true },
  { href: "/admin/users", label: "Users", icon: <Users size={20} />, exact: false },
  { href: "/admin/bookings", label: "All Bookings", icon: <Calendar size={20} />, exact: false },
  { href: "/admin/messages", label: "Messages", icon: <MessageSquare size={20} />, exact: false },
  { href: "/admin/services", label: "Services", icon: <Building2 size={20} />, exact: false },
  { href: "/admin/reports", label: "Reports", icon: <BarChart3 size={20} />, exact: false },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { data: session } = useSession();

  const user = session?.user as { id?: string; name?: string; email?: string; image?: string } | undefined;
  const initials = user?.name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() ?? "A";

  const handleSignOut = async () => {
    await signOutAndRedirect(router);
  };

  return (
    <div className="flex h-screen bg-[#FFFBE9] overflow-hidden">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-[#E8E0D0] flex flex-col transition-transform duration-300 lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-24 flex items-center px-6 border-b border-[#E8E0D0] flex-shrink-0">
          <Link href="/" className="flex items-center gap-2" onClick={() => setSidebarOpen(false)}>
            <BookoraLogo height={40} linked={false} />
          </Link>
          <span className="badge bg-[#FFF3E0] text-[#E65100] border border-[#FFCC80] text-[10px] ml-2">
            Admin
          </span>
        </div>

        <nav className="flex flex-col gap-1 px-3 py-4 flex-1 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                item.exact ? pathname === item.href : pathname.startsWith(item.href)
                  ? "bg-[#F5EDF4] text-[#724A6A] border-l-[3px] border-[#724A6A] pl-[9px]"
                  : "text-[#4A4A6A] hover:bg-[#FFFBE9] hover:text-[#724A6A]"
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-[#E8E0D0] flex flex-col gap-1">
          <Link href="/" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[#4A4A6A] hover:bg-[#FFFBE9] transition-colors">
            ← Back to Site
          </Link>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[#C62828] hover:bg-[#FFEBEE] w-full transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="h-24 flex-shrink-0 bg-[#FFFBE9] border-b border-[#E8E0D0] flex items-center px-4 sm:px-8 gap-4 sticky top-0 z-30">
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-[#F5EDF4] text-[#1A1A2E]"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          
          <div className="flex-1" />
          
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-xs font-semibold text-[#1A1A2E] leading-tight">
                {user?.name ?? "..."}
              </span>
              <span className="text-[10px] text-[#8A8AAA]">{user?.email}</span>
            </div>
            {user?.image ? (
              <img
                src={user.image}
                alt={user.name}
                className="w-10 h-10 rounded-full object-cover border-2 border-[#E8E0D0]"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-[#724A6A] flex items-center justify-center text-white text-sm font-bold">
                {initials}
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-8 bg-[#FFFBE9]">
          {children}
        </main>
      </div>
    </div>
  );
}
