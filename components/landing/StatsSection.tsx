"use client";

import { Smile, Building2, Calendar, Zap } from "lucide-react";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const stats = [
  { value: "10K+", label: "Happy Customers", icon: <Smile className="text-[#D4A017]" size={32} /> },
  { value: "500+", label: "Service Providers", icon: <Building2 className="text-[#724A6A]" size={32} /> },
  { value: "50K+", label: "Appointments Booked", icon: <Calendar className="text-[#724A6A]" size={32} /> },
  { value: "99.9%", label: "Uptime Guarantee", icon: <Zap className="text-[#E65100]" size={32} /> },
];

export default function StatsSection() {
  const [ref, isVisible] = useScrollReveal({ threshold: 0.2 });

  return (
    <section ref={ref} className={`py-12 bg-[#FFF3C4]/40 border-y border-[#E8E0D0] ${isVisible ? "sr-visible" : ""}`}>
      <div className="page-container">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((stat, i) => (
            <div
              key={i}
              className="sr-item flex flex-col items-center text-center p-5 rounded-2xl bg-[#FFFBE9] border border-[#E8E0D0] shadow-[0_2px_12px_rgba(114,74,106,0.06)] hover:shadow-[0_4px_20px_rgba(114,74,106,0.12)] transition-shadow"
              style={{ "--sr-delay": `${i * 0.12}` } as React.CSSProperties}
            >
              <span className="text-3xl mb-2">{stat.icon}</span>
              <span className="text-3xl font-bold text-[#724A6A] leading-tight">{stat.value}</span>
              <span className="text-sm text-[#4A4A6A] mt-1 font-medium">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
