import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import ConditionalShell from "@/components/ConditionalShell";
import { ToastContainer } from "@/components/ToastNotification";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Bookora — The Perfect Booking System",
  description:
    "Schedule appointments effortlessly. Real-time availability, instant confirmation, and seamless booking for every service.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  openGraph: {
    title: "Bookora — The Perfect Booking System",
    description: "Schedule appointments effortlessly with real-time availability.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${poppins.variable} h-full`} data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className="min-h-full flex flex-col font-[family-name:var(--font-poppins)]" suppressHydrationWarning>
        <ConditionalShell>{children}</ConditionalShell>
        <ToastContainer />
      </body>
    </html>
  );
}
