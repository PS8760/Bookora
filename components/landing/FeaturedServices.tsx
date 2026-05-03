"use client";

import Link from "next/link";
import useSWR from "swr";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { CalendarDays, Clock, Users, ArrowRight, Inbox } from "lucide-react";

const CATEGORY_COLORS: Record<string, { bg: string; accent: string }> = {
  Health:    { bg: "#E8F5E9", accent: "#2E7D32" },
  Beauty:    { bg: "#FFF8E1", accent: "#D4A017" },
  Fitness:   { bg: "#FFF3E0", accent: "#E65100" },
  Education: { bg: "#E0F2F1", accent: "#00695C" },
  "Pet Care":{ bg: "#E8EAF6", accent: "#3949AB" },
  Wellness:  { bg: "#F3E5F5", accent: "#724A6A" },
  Dental:    { bg: "#FFFBE9", accent: "#724A6A" },
  Spa:       { bg: "#FCE4EC", accent: "#C62828" },
  default:   { bg: "#F5EDF4", accent: "#724A6A" },
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function FeaturedServices() {
  const { data, isLoading, error } = useSWR("/api/appointments?limit=8&sort=createdAt", fetcher);
  const [sectionRef, isVisible] = useScrollReveal({ threshold: 0.1 });

  const services = data?.data ?? [];

  const getColors = (name: string | null) =>
    CATEGORY_COLORS[name ?? ""] ?? CATEGORY_COLORS.default;

  return (
    <section ref={sectionRef} className={`section bg-[#FFF3C4]/10 ${isVisible ? "sr-visible" : ""}`}>
      <div className="page-container">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="sr-item flex flex-col items-center">
            <span className="badge bg-[#FFF3C4] text-[#724A6A] border border-[#D4A017]/20 mb-3">
              Book Today
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#1A1A2E] max-w-2xl mx-auto">
              Featured <span className="gradient-brand-text">Services</span> Available Now
            </h2>
            <p className="text-[#4A4A6A] text-sm mt-4 max-w-xl italic">
              Explore our most popular services and secure your spot with ease.
            </p>
          </div>
        </div>

        {/* Loading skeleton */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-[#E8E0D0] overflow-hidden animate-pulse h-[320px]" />
            ))}
          </div>
        )}

        {/* Grid */}
        {!isLoading && !error && services.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map((s: any, i: number) => {
              const colors = getColors(s.category);
              const price = s.advancePayment && s.paymentAmount 
                ? `${s.currency === "INR" ? "₹" : s.currency}${parseFloat(s.paymentAmount).toLocaleString("en-IN")}`
                : "Free";

              return (
                <div
                  key={s.id}
                  className="sr-item-scale card-hover bg-white rounded-2xl border border-[#E8E0D0] shadow-[0_2px_12px_rgba(114,74,106,0.06)] overflow-hidden flex flex-col group"
                  style={{ "--sr-delay": `${0.1 + i * 0.1}` } as React.CSSProperties}
                >
                  <div className="p-6 flex-1 flex flex-col">
                    <div className="flex items-start justify-between mb-4">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                        style={{ background: colors.bg }}
                      >
                        {s.icon || <CalendarDays size={20} />}
                      </div>
                      <span className="text-sm font-bold text-[#724A6A]">{price}</span>
                    </div>

                    <h3 className="font-bold text-[#1A1A2E] text-base mb-1 group-hover:text-[#724A6A] transition-colors line-clamp-1">
                      {s.title}
                    </h3>
                    <p className="text-[11px] text-[#8A8AAA] mb-3">by {s.organiser.name}</p>

                    <div className="flex flex-wrap gap-3 mt-auto pt-4 border-t border-[#F5EDF4]">
                      <span className="flex items-center gap-1.5 text-[10px] text-[#4A4A6A] font-medium">
                        <Clock size={12} className="text-[#D4A017]" />
                        {s.durationMinutes}m
                      </span>
                      <span className="flex items-center gap-1.5 text-[10px] text-[#4A4A6A] font-medium">
                        <Users size={12} className="text-[#724A6A]" />
                        {s.availableSlots ?? 0} slots
                      </span>
                      {s.category && (
                        <span 
                          className="badge text-[9px] ml-auto"
                          style={{ background: colors.bg, color: colors.accent }}
                        >
                          {s.category}
                        </span>
                      )}
                    </div>
                  </div>

                  <Link
                    href={`/book/${s.id}`}
                    className="w-full py-3.5 bg-[#F5EDF4] text-[#724A6A] text-xs font-bold text-center hover:bg-[#724A6A] hover:text-white transition-all flex items-center justify-center gap-2 group/btn"
                  >
                    Book Now <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                  </Link>
                </div>
              );
            })}
          </div>
        ) : !isLoading && !error && (
          <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-[#E8E0D0]">
             <Inbox size={48} className="mx-auto text-[#8A8AAA] mb-4" />
             <p className="text-[#4A4A6A] font-medium">No featured services available at the moment.</p>
             <Link href="/services" className="text-[#724A6A] text-sm hover:underline mt-2 inline-block">Browse all services</Link>
          </div>
        )}

        {/* View All Footer */}
        <div className="mt-12 text-center">
          <Link 
            href="/services" 
            className="sr-item inline-flex items-center gap-2 text-[#724A6A] font-semibold hover:gap-3 transition-all"
            style={{ "--sr-delay": "0.8" } as React.CSSProperties}
          >
            Explore all available services <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    </section>
  );
}
