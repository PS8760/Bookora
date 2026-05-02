"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { signOutAndRedirect } from "@/lib/logout-client";
import BookoraLogo from "@/components/BookoraLogo";
import ChatSidebarSection from "@/components/chat/ChatSidebarSection";

const navItems = [
  {
    href: "/organiser", label: "Dashboard", icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    href: "/organiser/services", label: "Services", icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
      </svg>
    ),
  },
  {
    href: "/organiser/bookings", label: "Bookings", icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    href: "/organiser/reports", label: "Reports", icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
];

export default function OrganiserLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { data: session } = useSession();

  const user = session?.user as { id?: string; name?: string; email?: string; image?: string } | undefined;
  const initials = user?.name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() ?? "?";

  const handleSignOut = async () => {
    await signOutAndRedirect(router);
  };

  return (
    <div className="h-screen bg-[#FFFBE9] flex flex-col overflow-hidden">
      <header className="h-24 flex-shrink-0 bg-[#FFFBE9] border-b border-[#E8E0D0] flex items-center px-4 gap-4 sticky top-0 z-40">
        <button className="lg:hidden p-2 rounded-lg hover:bg-[#F5EDF4] text-[#4A4A6A]" onClick={() => setSidebarOpen(!sidebarOpen)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <Link href="/" className="flex items-center gap-2">
          <BookoraLogo height={48} linked={false} />
        </Link>
        <span className="badge bg-[#F5EDF4] text-[#724A6A] border border-[#D4B8CF] text-[10px]">Organiser</span>
        <div className="flex-1" />
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-xs font-semibold text-[#1A1A2E] leading-tight">{user?.name ?? "..."}</span>
            <span className="text-[10px] text-[#8A8AAA]">{user?.email}</span>
          </div>
          {user?.image ? (
            <img src={user.image} alt={user.name} className="w-8 h-8 rounded-full object-cover border-2 border-[#E8E0D0]" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-[#D4A017] flex items-center justify-center text-white text-xs font-bold">
              {initials}
            </div>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {sidebarOpen && <div className="fixed inset-0 bg-black/30 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />}

        <aside className={`fixed lg:static top-24 bottom-0 left-0 z-40 w-56 bg-white border-r border-[#E8E0D0] flex flex-col py-4 transition-transform duration-300 h-full ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
          <nav className="flex flex-col gap-1 px-3">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${pathname === item.href
                  ? "bg-[#F5EDF4] text-[#724A6A] border-l-[3px] border-[#724A6A] pl-[9px]"
                  : "text-[#4A4A6A] hover:bg-[#FFFBE9] hover:text-[#724A6A]"
                  }`}>
                {item.icon}{item.label}
              </Link>
            ))}
          </nav>

          <div className="flex-1 overflow-y-auto min-h-0">
            {user?.id && <ChatSidebarSection currentUserId={user.id} />}
          </div>

          <div className="px-3 pt-3 border-t border-[#E8E0D0] flex flex-col gap-1">
            <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[#4A4A6A] hover:bg-[#FFFBE9] transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
              </svg>
              Customer View
            </Link>
            <button onClick={handleSignOut}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[#C62828] hover:bg-[#FFEBEE] w-full transition-colors">
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
