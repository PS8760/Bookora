"use client";

import Link from "next/link";
import Image from "next/image";
import { useScrollReveal } from "@/hooks/useScrollReveal";

export default function HeroSection() {
  const [heroRef, heroVisible] = useScrollReveal({ threshold: 0.1, rootMargin: "0px" });

  return (
    <section
      ref={heroRef}
      className={`relative min-h-screen flex items-center overflow-hidden bg-[#FFFBE9] ${heroVisible ? "sr-visible" : ""}`}
      style={{ paddingTop: "80px" }}
    >
      {/* Background decorations */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Large soft circle top-right */}
        <div
          className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full opacity-30"
          style={{ background: "radial-gradient(circle, #FFF3C4 0%, transparent 70%)" }}
        />
        {/* Small circle bottom-left */}
        <div
          className="absolute -bottom-20 -left-20 w-[400px] h-[400px] rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, #F5EDF4 0%, transparent 70%)" }}
        />
        {/* Dot grid pattern */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="dots" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.5" fill="#724A6A" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dots)" />
        </svg>
        {/* Decorative arcs */}
        <svg className="absolute top-20 right-0 w-64 h-64 opacity-10" viewBox="0 0 200 200" fill="none">
          <circle cx="150" cy="50" r="120" stroke="#724A6A" strokeWidth="1.5" strokeDasharray="8 6" />
          <circle cx="150" cy="50" r="80" stroke="#D4A017" strokeWidth="1" strokeDasharray="4 8" />
        </svg>
      </div>

      <div className="page-container relative z-10 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center py-16 lg:py-24">

          {/* Left — Text content */}
          <div className="flex flex-col gap-6">
            {/* Headline */}
            <div className="sr-item" style={{ "--sr-delay": "0.1" } as React.CSSProperties}>
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.08] tracking-tight text-[#1A1A2E]">
                Book Smarter.
                <br />
                Manage Better.
                <br />
                Grow Faster.
              </h1>
            </div>

            {/* Subtext */}
            <div className="sr-item" style={{ "--sr-delay": "0.25" } as React.CSSProperties}>
              <p className="text-base sm:text-lg text-[#4A4A6A] leading-relaxed max-w-lg italic">
                Seamlessly schedule appointments,<br />
                manage resources, and stay in control<br />
                <span className="not-italic font-medium text-[#724A6A]">~all in real time with Bookora</span>
              </p>
            </div>

            {/* CTA buttons */}
            <div className="sr-item flex flex-wrap gap-3 pt-2" style={{ "--sr-delay": "0.4" } as React.CSSProperties}>
              <Link
                href="/book"
                className="btn-primary text-base px-7 py-3.5 rounded-xl shadow-[0_4px_20px_rgba(114,74,106,0.3)]"
              >
                Book Appointment
              </Link>
              <Link
                href="/register"
                className="btn-outline text-base px-7 py-3.5 rounded-xl"
              >
                Get Started Free
              </Link>
            </div>
          </div>

          {/* Right — Graphic Element */}
          <div className="sr-item-right relative flex items-center justify-center lg:justify-end" style={{ "--sr-delay": "0.3" } as React.CSSProperties}>
            <div className="relative w-[110%] lg:w-[125%] -right-[5%] lg:-right-[15%] animate-float-glow drop-shadow-[0_20px_50px_rgba(114,74,106,0.15)]">
              <Image
                src="/Graphic_Element.png"
                alt="Bookora scheduling illustration"
                width={2000}
                height={1400}
                className="w-full h-auto object-contain"
                priority
              />
              {/* Decorative Glow behind the image */}
              <div className="absolute inset-0 bg-gradient-to-tr from-[#724A6A]/10 to-transparent blur-3xl -z-10 rounded-full animate-pulse-soft" />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom wave */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
          <path d="M0 60L60 50C120 40 240 20 360 15C480 10 600 20 720 25C840 30 960 30 1080 25C1200 20 1320 10 1380 5L1440 0V60H0Z" fill="#FFF3C4" fillOpacity="0.4" />
        </svg>
      </div>
    </section>
  );
}
