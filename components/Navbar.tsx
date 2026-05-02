"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import BookoraLogo from "@/components/BookoraLogo";
import { useSession, signOut } from "@/lib/auth-client";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role ?? "customer";
  const dashboardHref =
    role === "admin" ? "/admin" : role === "organiser" ? "/organiser" : "/dashboard";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/services", label: "Services" },
    { href: "/about", label: "About" },
  ];

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[#FFFBE9]/95 backdrop-blur-md shadow-[0_2px_20px_rgba(114,74,106,0.10)] border-b border-[#E8E0D0]"
          : "bg-transparent"
      }`}
    >
      <div className="page-container">
        <div className="flex items-center justify-between h-18 py-2">
          {/* Logo */}
          <Link href="/" className="flex items-center group">
            <BookoraLogo height={56} linked={false} />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                  pathname === link.href
                    ? "bg-[#724A6A]/10 text-[#724A6A]"
                    : "text-[#4A4A6A] hover:bg-[#724A6A]/8 hover:text-[#724A6A]"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            {session?.user ? (
              /* Logged-in state */
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-[#E8E0D0] bg-white hover:border-[#724A6A] transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-[#724A6A] flex items-center justify-center text-white text-xs font-bold">
                    {session.user.name?.charAt(0).toUpperCase() || "U"}
                  </div>
                  <span className="text-sm font-medium text-[#1A1A2E] max-w-[120px] truncate">
                    {session.user.name}
                  </span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-[#8A8AAA]">
                    <path d="M6 9l6 6 6-6"/>
                  </svg>
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl border border-[#E8E0D0] shadow-[0_8px_32px_rgba(114,74,106,0.15)] py-1 z-50">
                    <Link
                      href={dashboardHref}
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-[#4A4A6A] hover:bg-[#F5EDF4] hover:text-[#724A6A] transition-colors"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                      Dashboard
                    </Link>
                    <Link
                      href="/profile"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-[#4A4A6A] hover:bg-[#F5EDF4] hover:text-[#724A6A] transition-colors"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      Profile
                    </Link>
                    <div className="h-px bg-[#E8E0D0] my-1" />
                    <button
                      onClick={handleSignOut}
                      className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-[#C62828] hover:bg-[#FFEBEE] transition-colors"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Logged-out state */
              <>
                <Link href="/book" className="btn-outline text-sm py-2 px-5">
                  Book Now
                </Link>
                <Link href="/register" className="btn-primary text-sm py-2 px-5">
                  SignUp
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-lg text-[#4A4A6A] hover:bg-[#724A6A]/10 transition-colors"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            <div className="w-5 h-4 flex flex-col justify-between">
              <span className={`block h-0.5 bg-current rounded transition-all duration-300 ${menuOpen ? "rotate-45 translate-y-[7px]" : ""}`} />
              <span className={`block h-0.5 bg-current rounded transition-all duration-300 ${menuOpen ? "opacity-0" : ""}`} />
              <span className={`block h-0.5 bg-current rounded transition-all duration-300 ${menuOpen ? "-rotate-45 -translate-y-[7px]" : ""}`} />
            </div>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        className={`md:hidden transition-all duration-300 overflow-hidden ${
          menuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="bg-[#FFFBE9]/98 backdrop-blur-md border-t border-[#E8E0D0] px-6 py-4 flex flex-col gap-2">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                pathname === link.href
                  ? "bg-[#724A6A]/10 text-[#724A6A]"
                  : "text-[#4A4A6A] hover:bg-[#724A6A]/8"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <div className="flex flex-col gap-2 pt-2 border-t border-[#E8E0D0]">
            {session?.user ? (
              <>
                <Link href={dashboardHref} onClick={() => setMenuOpen(false)} className="btn-outline text-sm py-2.5 text-center">
                  Dashboard
                </Link>
                <button onClick={handleSignOut} className="btn-primary text-sm py-2.5 text-center bg-[#C62828] hover:bg-[#B71C1C]">
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link href="/book" onClick={() => setMenuOpen(false)} className="btn-outline text-sm py-2.5 text-center">
                  Book Now
                </Link>
                <Link href="/register" onClick={() => setMenuOpen(false)} className="btn-primary text-sm py-2.5 text-center">
                  SignUp
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
