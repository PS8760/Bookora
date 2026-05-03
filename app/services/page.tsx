"use client";

import { useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";
import useSWR from "swr";
import { LIVE_REFRESH_MS, jsonFetcher } from "@/lib/realtime";

const CATEGORY_COLORS: Record<string, { bg: string; accent: string }> = {
  Health:    { bg: "#E8F5E9", accent: "#2E7D32" },
  Beauty:    { bg: "#FFF8E1", accent: "#D4A017" },
  Fitness:   { bg: "#FFF3E0", accent: "#E65100" },
  Education: { bg: "#E0F2F1", accent: "#00695C" },
  "Pet Care":{ bg: "#E8EAF6", accent: "#3949AB" },
  Wellness:  { bg: "#F3E5F5", accent: "#724A6A" },
  default:   { bg: "#E1F5FE", accent: "#0277BD" },
};

interface Service {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  icon: string | null;
  durationMinutes: number;
  paymentAmount: string | null;
  currency: string;
  advancePayment: boolean;
  availableSlots: number;
  organiser: { name: string };
  _count: { bookings: number };
  isPublished?: boolean;
}

interface CategoriesResponse {
  data?: { name: string }[];
}

interface ServicesResponse {
  data?: Service[];
  pagination?: { total?: number };
}

function ServicesContent() {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get("category") ?? "All";
  const { data: session } = useSession();
  const isLoggedIn = !!session?.user;

  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const { data: categoryData } = useSWR<CategoriesResponse>(
    "/api/appointments/categories",
    jsonFetcher,
    { refreshInterval: LIVE_REFRESH_MS, revalidateOnFocus: true }
  );
  const categoryNames: string[] = (categoryData?.data ?? []).map((c: { name: string }) => c.name);
  const categories = ["All", ...categoryNames];
  const selectedCategory =
    activeCategory !== "All" && !categoryNames.includes(activeCategory)
      ? "All"
      : activeCategory;

  const servicesUrl = useMemo(() => {
    const params = new URLSearchParams({ sort: sortBy, limit: "30", showAll: "true" });
    if (selectedCategory !== "All") params.set("category", selectedCategory);
    if (search.trim()) params.set("search", search.trim());
    return `/api/appointments?${params.toString()}`;
  }, [selectedCategory, sortBy, search]);

  const { data: servicesData, error, isLoading, mutate } = useSWR<ServicesResponse>(
    servicesUrl,
    jsonFetcher,
    { refreshInterval: LIVE_REFRESH_MS, revalidateOnFocus: true }
  );
  const services: Service[] = servicesData?.data ?? [];
  const total = servicesData?.pagination?.total ?? 0;

  const formatPrice = (s: Service) => {
    if (!s.advancePayment || !s.paymentAmount) return "Free";
    const symbol = s.currency === "INR" ? "₹" : s.currency;
    return `${symbol}${parseFloat(s.paymentAmount).toLocaleString("en-IN")}`;
  };

  const getColors = (category: string | null) =>
    CATEGORY_COLORS[category ?? ""] ?? CATEGORY_COLORS.default;

  return (
    <div className="min-h-screen bg-[#FFFBE9] pt-20">
      {/* Header */}
      <div className="py-12">
        <div className="page-container">
          <h1 className="text-3xl sm:text-4xl font-bold text-[#1A1A2E] mb-2">
            Browse <span className="gradient-brand-text">Services</span>
          </h1>
          <p className="text-[#4A4A6A] text-base">
            {isLoading ? "Loading..." : `${total} service${total !== 1 ? "s" : ""} available · Book instantly`}
          </p>
        </div>
      </div>

      <div className="page-container py-8 sm:py-12">
        {/* Search + Sort */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex items-center gap-2 flex-1 border border-[#E8E0D0] rounded-xl bg-white px-4 h-11 shadow-[0_1px_4px_rgba(114,74,106,0.04)]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8A8AAA" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              className="flex-1 bg-transparent outline-none text-sm text-[#1A1A2E] placeholder:text-[#8A8AAA]"
              placeholder="Search services or providers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch("")} className="text-[#8A8AAA] hover:text-[#724A6A]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            )}
          </div>
          <select
            className="input-base h-11 w-full sm:w-48 cursor-pointer text-sm"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="createdAt">Sort: Newest</option>
            <option value="price">Sort: Price Low–High</option>
            <option value="title">Sort: A–Z</option>
          </select>
        </div>

        {/* Category pills */}
        <div className="flex gap-2 flex-wrap mb-7">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setActiveCategory(c)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                selectedCategory === c
                  ? "bg-[#724A6A] text-[#FFFBE9] shadow-[0_2px_8px_rgba(114,74,106,0.3)]"
                  : "bg-white text-[#4A4A6A] border border-[#E8E0D0] hover:border-[#724A6A] hover:text-[#724A6A] shadow-[0_1px_3px_rgba(114,74,106,0.04)]"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Results count */}
        {!isLoading && !error && (
          <p className="text-sm text-[#8A8AAA] mb-6">
            Showing <strong className="text-[#1A1A2E]">{services.length}</strong>
            {total > services.length ? ` of ${total}` : ""} service{services.length !== 1 ? "s" : ""}
          </p>
        )}

        {/* Error state */}
        {error && (
          <div className="text-center py-16">
            <span className="text-4xl mb-3 block">⚠️</span>
            <p className="text-[#C62828] font-medium mb-3">
              {error instanceof Error ? error.message : "Could not load services. Please try again."}
            </p>
            <button onClick={() => mutate()} className="btn-primary text-sm py-2 px-5">
              Retry
            </button>
          </div>
        )}

        {/* Loading skeleton */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-[#E8E0D0] overflow-hidden animate-pulse">
                <div className="p-5 pb-4">
                  <div className="flex gap-3 mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-[#F0EAD8]" />
                    <div className="flex-1 space-y-2 pt-1">
                      <div className="h-4 bg-[#F0EAD8] rounded w-3/4" />
                      <div className="h-3 bg-[#F0EAD8] rounded w-1/2" />
                    </div>
                  </div>
                  <div className="h-3 bg-[#F0EAD8] rounded w-full mb-2" />
                  <div className="h-3 bg-[#F0EAD8] rounded w-2/3" />
                </div>
                <div className="px-5 py-3 border-t border-[#F0EAD8] flex justify-between">
                  <div className="h-5 bg-[#F0EAD8] rounded w-16" />
                  <div className="h-8 bg-[#F0EAD8] rounded w-24" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Grid */}
        {!isLoading && !error && services.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((s) => {
              const colors = getColors(s.category);
              return (
                <div
                  key={s.id}
                  className="card-hover bg-white rounded-2xl border border-[#E8E0D0] shadow-[0_2px_12px_rgba(114,74,106,0.06)] overflow-hidden flex flex-col"
                >
                  <div className="p-6 pb-4 flex-1">
                    <div className="flex items-start gap-4 mb-4">
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 overflow-hidden"
                        style={{ background: colors.bg }}
                      >
                        {s.icon?.startsWith('/') || s.icon?.startsWith('http') ? (
                          <img src={s.icon} alt={s.title} className="w-full h-full object-cover" />
                        ) : (
                          s.icon || "📅"
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-[#1A1A2E] text-base leading-tight">{s.title}</h3>
                        <p className="text-xs text-[#8A8AAA] mt-0.5 truncate">{s.organiser.name}</p>
                        {s.category && (
                          <span
                            className="badge mt-2 text-[10px]"
                            style={{ background: colors.bg, color: colors.accent }}
                          >
                            {s.category}
                          </span>
                        )}
                      </div>
                    </div>

                    {s.description && (
                      <p className="text-xs text-[#4A4A6A] leading-relaxed mb-4 line-clamp-2">
                        {s.description}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-xs text-[#4A4A6A]">
                      <span className="flex items-center gap-1">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                        </svg>
                        {s.durationMinutes} min
                      </span>
                      <span className="flex items-center gap-1">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                        </svg>
                        {s.availableSlots ?? 0} slots available
                      </span>
                      <span
                        className={`ml-auto font-semibold text-xs ${
                          s.availableSlots === 0
                            ? "text-[#C62828]"
                            : s.availableSlots <= 5
                            ? "text-[#E65100]"
                            : "text-[#2E7D32]"
                        }`}
                      >
                        {s.availableSlots === 0
                          ? "Fully booked"
                          : s.availableSlots <= 5
                          ? `${s.availableSlots} left`
                          : `${s.availableSlots} slots`}
                      </span>
                    </div>
                  </div>

                  <div className="px-6 py-4 border-t border-[#F0EAD8] flex items-center justify-between bg-[#FDFAF3]">
                    <span className="font-bold text-[#724A6A] text-base">{formatPrice(s)}</span>
                    {isLoggedIn && s.isPublished ? (
                      <Link href={`/book/${s.id}`} className="btn-primary text-xs py-2 px-4 rounded-lg">
                        Book Now
                      </Link>
                    ) : isLoggedIn && !s.isPublished ? (
                      <span className="text-xs py-2 px-4 rounded-lg border border-[#E8E0D0] text-[#8A8AAA] font-semibold">
                        Coming soon
                      </span>
                    ) : (
                      <Link
                        href={`/login?callbackUrl=/book/${s.id}`}
                        className="text-xs py-2 px-4 rounded-lg border border-[#724A6A] text-[#724A6A] font-semibold hover:bg-[#F5EDF4] transition-colors"
                      >
                        Login to Book
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && services.length === 0 && (
          <div className="text-center py-20">
            <span className="text-5xl mb-4 block">🔍</span>
            <h3 className="font-semibold text-[#1A1A2E] mb-2">No services found</h3>
            <p className="text-sm text-[#4A4A6A]">Try adjusting your search or filters</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ServicesPage() {
  return (
    <Suspense
      fallback={
        <div className="pt-20">
          <div className="bg-[#FFF3C4]/40 border-b border-[#E8E0D0] py-14">
            <div className="page-container">
              <div className="h-9 bg-[#F0EAD8] rounded-xl w-64 mb-3 animate-pulse" />
              <div className="h-5 bg-[#F0EAD8] rounded w-48 animate-pulse" />
            </div>
          </div>
          <div className="page-container py-10">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-[#E8E0D0] overflow-hidden animate-pulse">
                  <div className="p-5 pb-4">
                    <div className="flex gap-3 mb-4">
                      <div className="w-14 h-14 rounded-2xl bg-[#F0EAD8]" />
                      <div className="flex-1 space-y-2 pt-1">
                        <div className="h-4 bg-[#F0EAD8] rounded w-3/4" />
                        <div className="h-3 bg-[#F0EAD8] rounded w-1/2" />
                      </div>
                    </div>
                    <div className="h-3 bg-[#F0EAD8] rounded w-full mb-2" />
                    <div className="h-3 bg-[#F0EAD8] rounded w-2/3" />
                  </div>
                  <div className="px-5 py-3 border-t border-[#F0EAD8] flex justify-between">
                    <div className="h-5 bg-[#F0EAD8] rounded w-16" />
                    <div className="h-8 bg-[#F0EAD8] rounded w-24" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      }
    >
      <ServicesContent />
    </Suspense>
  );
}
