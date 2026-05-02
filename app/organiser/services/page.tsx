"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import OrganiserLayout from "@/components/organiser/OrganiserLayout";
import { dashboardSWRConfig, jsonFetcher } from "@/lib/realtime";

const CATEGORY_COLORS: Record<string, string> = {
  Health: "#E8F5E9", Beauty: "#FFF8E1", Fitness: "#FFF3E0",
  Education: "#E0F2F1", "Pet Care": "#E8EAF6", Wellness: "#F3E5F5",
  default: "#E1F5FE",
};

function Skeleton({ className }: { className?: string }) {
  return <div className={`skeleton rounded-xl ${className}`} />;
}

interface Service {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  icon: string | null;
  durationMinutes: number;
  isPublished: boolean;
  paymentAmount: string | null;
  currency: string;
  advancePayment: boolean;
  maxPerSlot: number;
  shareToken: string | null;
  _count: { bookings: number };
  availableSlots: number;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function OrganiserServicesPage() {
  const { data, error, mutate } = useSWR<{ data: any }>(
    "/api/appointments?limit=50&scope=own",
    jsonFetcher,
    dashboardSWRConfig
  );

  const { data: sessionData } = useSWR("/api/auth/get-session", fetcher);
  const currentUserId = sessionData?.user?.id;

  const loading = (!data && !error) || !sessionData;
  const services: Service[] = data?.data ?? [];

  const [toggling, setToggling] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [sharing, setSharing] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const handleTogglePublish = async (svc: Service) => {
    setToggling(svc.id);
    try {
      if (svc.isPublished) {
        const res = await fetch(`/api/appointments/${svc.id}/publish`, { method: "DELETE" });
        if (!res.ok) {
          const j = await res.json().catch(() => null);
          alert(j?.error?.message ?? "Unable to unpublish this service right now.");
          return;
        }
      } else {
        const res = await fetch(`/api/appointments/${svc.id}/publish`, { method: "POST" });
        if (!res.ok) {
          const j = await res.json().catch(() => null);
          alert(j?.error?.message ?? "Cannot publish: check schedule configuration.");
          return;
        }
      }
      mutate();
    } finally {
      setToggling(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this service? This cannot be undone.")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/appointments/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        alert(j?.error?.message ?? "Unable to delete this service right now.");
        return;
      }
      mutate();
    } finally {
      setDeleting(null);
    }
  };

  const handleCopyShareLink = async (svc: Service) => {
    setSharing(svc.id);
    try {
      const res = await fetch(`/api/appointments/${svc.id}/share-link`);
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        alert(j?.error?.message ?? "Unable to generate share link.");
        return;
      }

      const j = await res.json();
      const shareUrl =
        j?.data?.shareUrl ??
        (j?.data?.shareToken ? `${window.location.origin}/book/${svc.id}?share=${j.data.shareToken}` : null);

      if (!shareUrl) {
        alert("Unable to generate share link.");
        return;
      }

      await navigator.clipboard.writeText(shareUrl);
      setCopied(svc.id);
      setTimeout(() => setCopied(null), 2000);
      mutate();
    } finally {
      setSharing(null);
    }
  };

  const formatPrice = (svc: Service) => {
    if (!svc.advancePayment || !svc.paymentAmount) return "Free";
    const sym = svc.currency === "INR" ? "₹" : svc.currency;
    return `${sym}${parseFloat(svc.paymentAmount).toLocaleString("en-IN")}`;
  };

  return (
    <OrganiserLayout>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#1A1A2E]">My Services</h1>
            {!loading && (
              <p className="text-sm text-[#4A4A6A] mt-1">
                {services.length} service{services.length !== 1 ? "s" : ""} ·{" "}
                {services.filter((s) => s.isPublished).length} published
              </p>
            )}
          </div>
          <Link href="/organiser/services/new" className="btn-primary text-sm py-2.5 px-5">
            + Create Service
          </Link>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="text-center py-16">
            <span className="text-4xl mb-3 block">⚠️</span>
            <p className="text-sm text-[#C62828]">Failed to load services.</p>
            <button onClick={() => mutate()} className="btn-primary text-sm py-2 px-4 mt-3">
              Retry
            </button>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && services.length === 0 && (
          <div className="text-center py-20">
            <span className="text-5xl mb-4 block">🏢</span>
            <h3 className="font-semibold text-[#1A1A2E] mb-2">No services yet</h3>
            <p className="text-sm text-[#4A4A6A] mb-5">
              Create your first service to start accepting bookings.
            </p>
            <Link href="/organiser/services/new" className="btn-primary text-sm py-2.5 px-6">
              + Create Service
            </Link>
          </div>
        )}

        {/* Service list */}
        {!loading && !error && services.length > 0 && (
          <div className="grid grid-cols-1 gap-4">
            {services.map((svc: any) => {
              const color = CATEGORY_COLORS[svc.category ?? ""] ?? CATEGORY_COLORS.default;
              return (
                <div
                  key={svc.id}
                  className="bg-white rounded-2xl border border-[#E8E0D0] p-5 shadow-[0_2px_12px_rgba(114,74,106,0.06)] flex flex-col sm:flex-row sm:items-center gap-4"
                >
                  {/* Icon */}
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                    style={{ background: color }}
                  >
                    {svc.icon ?? "📅"}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-[#1A1A2E]">{svc.title}</h3>
                      <span
                        className={`badge text-[10px] ${
                          svc.isPublished
                            ? "bg-[#E8F5E9] text-[#2E7D32]"
                            : "bg-[#FFF3E0] text-[#E65100]"
                        }`}
                      >
                        {svc.isPublished ? "Published" : "Draft"}
                      </span>
                      {svc.category && (
                        <span className="badge text-[10px] bg-[#F5EDF4] text-[#724A6A]">
                          {svc.category}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-4 mt-1.5 text-xs text-[#8A8AAA]">
                      <span>⏱ {svc.durationMinutes} min</span>
                      <span>📅 {svc._count?.bookings ?? 0} bookings</span>
                      <span>🕐 {svc.availableSlots ?? 0} slots available</span>
                      <span>👥 Max {svc.maxPerSlot}/slot</span>
                      <span className="font-semibold text-[#724A6A]">{formatPrice(svc)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                    <Link
                      href={`/organiser/services/${svc.id}/edit`}
                      className="btn-outline text-xs py-1.5 px-3 rounded-lg"
                    >
                      Edit
                    </Link>

                    <button
                      onClick={() => handleTogglePublish(svc)}
                      disabled={toggling === svc.id}
                      className={`text-xs py-1.5 px-3 rounded-lg font-semibold transition-colors disabled:opacity-50 ${
                        svc.isPublished
                          ? "bg-[#FFF3E0] text-[#E65100] hover:bg-[#FFE0B2]"
                          : "bg-[#E8F5E9] text-[#2E7D32] hover:bg-[#C8E6C9]"
                      }`}
                    >
                      {toggling === svc.id
                        ? "..."
                        : svc.isPublished
                        ? "Unpublish"
                        : "Publish"}
                    </button>

                    <button
                      onClick={() => handleCopyShareLink(svc)}
                      disabled={!svc.isPublished || sharing === svc.id}
                      className="text-xs py-1.5 px-3 rounded-lg bg-[#F5EDF4] text-[#724A6A] hover:bg-[#E8D5E4] transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {sharing === svc.id ? "..." : copied === svc.id ? "✓ Copied!" : "Share Link"}
                    </button>

                    <button
                      onClick={() => handleDelete(svc.id)}
                      disabled={deleting === svc.id}
                      className="text-xs py-1.5 px-3 rounded-lg bg-[#FFEBEE] text-[#C62828] hover:bg-[#FFCDD2] transition-colors font-semibold disabled:opacity-50"
                    >
                      {deleting === svc.id ? "..." : "Delete"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </OrganiserLayout>
  );
}
