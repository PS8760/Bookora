"use client";

import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

// Routes that have their own full-page layout (sidebar dashboards)
// — Navbar and Footer should NOT be rendered on these.
const EXCLUDED_PREFIXES = [
  "/dashboard",
  "/organiser",
  "/admin",
  "/profile",
];

export default function ConditionalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isExcluded = EXCLUDED_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (isExcluded) {
    return <>{children}</>;
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#FFFBE9]">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
