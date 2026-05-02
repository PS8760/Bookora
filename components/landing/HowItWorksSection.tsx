"use client";

import { Search, Calendar, Pencil, CheckCircle2 } from "lucide-react";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const steps = [
  {
    step: "01",
    title: "Browse Services",
    desc: "Explore available appointment types from verified providers across categories.",
    icon: <Search className="text-[#724A6A]" size={32} />,
  },
  {
    step: "02",
    title: "Pick a Slot",
    desc: "Choose your preferred date and time from real-time available slots.",
    icon: <Calendar className="text-[#0277BD]" size={32} />,
  },
  {
    step: "03",
    title: "Fill Details",
    desc: "Answer a few quick questions and confirm your booking information.",
    icon: <Pencil className="text-[#E65100]" size={32} />,
  },
  {
    step: "04",
    title: "You're Booked!",
    desc: "Get instant confirmation with all details. Reschedule anytime if needed.",
    icon: <CheckCircle2 className="text-[#2E7D32]" size={32} />,
  },
];

export default function HowItWorksSection() {
  const [ref, isVisible] = useScrollReveal({ threshold: 0.1 });

  return (
    <section ref={ref} className={`section bg-[#FFF3C4]/30 ${isVisible ? "sr-visible" : ""}`}>
      <div className="page-container">
        {/* Header */}
        <div className="text-center mb-14">
          <div className="sr-item" style={{ "--sr-delay": "0" } as React.CSSProperties}>
            <span className="badge bg-[#FFF3C4] text-[#D4A017] border border-[#FFE88A] mb-4">
              How It Works
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#1A1A2E] mb-4">
              Book in <span className="gradient-brand-text">4 simple steps</span>
            </h2>
            <p className="text-[#4A4A6A] max-w-xl mx-auto text-base leading-relaxed">
              From discovery to confirmation in under 2 minutes. No phone calls, no waiting.
            </p>
          </div>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* Connector line (desktop) — grows on scroll */}
          <div className="hidden lg:block absolute top-10 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-[#724A6A] via-[#D4A017] to-[#724A6A] opacity-20 sr-grow-line" />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((s, i) => (
              <div
                key={i}
                className="sr-item relative flex flex-col items-center text-center group"
                style={{ "--sr-delay": `${0.15 + i * 0.15}` } as React.CSSProperties}
              >
                {/* Step circle */}
                <div className="relative mb-5">
                  <div className="w-20 h-20 rounded-2xl bg-[#FFFBE9] border-2 border-[#E8E0D0] flex items-center justify-center text-3xl shadow-[0_4px_16px_rgba(114,74,106,0.10)] group-hover:border-[#724A6A] group-hover:shadow-[0_8px_24px_rgba(114,74,106,0.18)] transition-all duration-200">
                    {s.icon}
                  </div>
                  <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-[#724A6A] text-white text-xs font-bold flex items-center justify-center shadow-md">
                    {s.step}
                  </div>
                </div>
                <h3 className="font-semibold text-[#1A1A2E] mb-2">{s.title}</h3>
                <p className="text-sm text-[#4A4A6A] leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
