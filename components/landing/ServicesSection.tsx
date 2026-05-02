"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const CATEGORY_COLORS: Record<string, { bg: string; accent: string; icon: string }> = {
  Health:    { bg: "#E8F5E9", accent: "#2E7D32", icon: "👨‍⚕️" },
  Beauty:    { bg: "#FFF8E1", accent: "#D4A017", icon: "💇" },
  Fitness:   { bg: "#FFF3E0", accent: "#E65100", icon: "🏋️" },
  Education: { bg: "#E0F2F1", accent: "#00695C", icon: "📚" },
  "Pet Care":{ bg: "#E8EAF6", accent: "#3949AB", icon: "🐾" },
  Wellness:  { bg: "#F3E5F5", accent: "#724A6A", icon: "🧘" },
  Dental:    { bg: "#E1F5FE", accent: "#0277BD", icon: "🦷" },
  Spa:       { bg: "#FCE4EC", accent: "#C62828", icon: "💆" },
  default:   { bg: "#E1F5FE", accent: "#0277BD", icon: "📅" },
};

interface Category {
  name: string;
  count: number;
}

export default function ServicesSection() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/appointments/categories")
      .then((r) => r.json())
      .then((json) => {
        if (json.data) setCategories(json.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const getColors = (name: string) =>
    CATEGORY_COLORS[name] ?? CATEGORY_COLORS.default;

  return (
    <section className="section bg-[#FFFBE9]">
      <div className="page-container">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <span className="badge bg-[#F5EDF4] text-[#724A6A] border border-[#D4B8CF] mb-3">
              Popular Categories
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#1A1A2E]">
              Browse by <span className="gradient-brand-text">Service</span>
            </h2>
          </div>
          <Link href="/services" className="btn-outline text-sm py-2.5 px-5 self-start sm:self-auto">
            View All →
          </Link>
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse flex flex-col items-center text-center p-5 rounded-2xl bg-[#F0EAD8] border border-[#E8E0D0] h-28"
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && categories.length === 0 && (
          <div className="text-center py-16">
            <span className="text-4xl mb-3 block">📭</span>
            <p className="text-[#4A4A6A] text-sm">No services available yet. Check back soon!</p>
          </div>
        )}

        {/* Grid */}
        {!loading && categories.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {categories.map((cat) => {
              const colors = getColors(cat.name);
              return (
                <Link
                  key={cat.name}
                  href={`/services?category=${encodeURIComponent(cat.name)}`}
                  className="card-hover group flex flex-col items-center text-center p-5 rounded-2xl bg-[#FFFBE9] border border-[#E8E0D0] shadow-[0_2px_8px_rgba(114,74,106,0.06)] cursor-pointer"
                >
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-3 group-hover:scale-110 transition-transform"
                    style={{ background: colors.bg }}
                  >
                    {colors.icon}
                  </div>
                  <h3 className="font-semibold text-sm text-[#1A1A2E] mb-1">{cat.name}</h3>
                  <p className="text-xs text-[#8A8AAA]">
                    {cat.count} {cat.count === 1 ? "service" : "services"}
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
