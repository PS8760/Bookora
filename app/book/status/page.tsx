"use client";

import { useEffect, useState, Suspense, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useStripe } from "@stripe/react-stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { getStripe } from "@/lib/stripe-client";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronRight,
  RefreshCcw,
  Calendar,
  Clock,
  Home,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

type PageStatus = "loading" | "success" | "processing" | "failed";

interface BookingDetails {
  id: string;
  status: string;
  paymentStatus: string;
  service: { title: string };
  providerSlot?: { startTime: string; endTime: string } | null;
}

// ─── Polling helper ───────────────────────────────────────────────────────────

async function fetchBookingFromDB(bookingId: string): Promise<BookingDetails | null> {
  try {
    const res = await fetch(`/api/bookings/${bookingId}`);
    if (!res.ok) return null;
    const j = await res.json();
    return j.data ?? null;
  } catch {
    return null;
  }
}

// ─── Main content component ───────────────────────────────────────────────────

function PaymentStatusContent() {
  const stripe = useStripe();
  const searchParams = useSearchParams();

  const bookingId = searchParams.get("bookingId");
  const clientSecret = searchParams.get("payment_intent_client_secret");

  const [pageStatus, setPageStatus] = useState<PageStatus>("loading");
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("Payment was not completed.");
  const [pollCount, setPollCount] = useState(0);

  // ── Step 1: Read Stripe's authoritative payment status from their API ──────
  useEffect(() => {
    if (!stripe) return;

    if (!clientSecret) {
      setPageStatus("failed");
      setErrorMessage("No payment information found. Please check your bookings.");
      return;
    }

    stripe.retrievePaymentIntent(clientSecret).then(({ paymentIntent }) => {
      switch (paymentIntent?.status) {
        case "succeeded":
          setPageStatus("processing"); // Will upgrade to "success" after DB poll
          break;
        case "processing":
          setPageStatus("processing");
          break;
        case "requires_payment_method":
          setPageStatus("failed");
          setErrorMessage("Your payment was declined. Please try a different payment method.");
          break;
        case "canceled":
          setPageStatus("failed");
          setErrorMessage("Your payment was cancelled.");
          break;
        default:
          setPageStatus("failed");
          setErrorMessage("Something went wrong with the payment.");
          break;
      }
    });
  }, [stripe, clientSecret]);

  // ── Step 2: Poll our DB until the webhook has confirmed the booking ────────
  // Retries up to 8× (≈16 seconds total) to account for webhook latency.
  const pollDB = useCallback(async () => {
    if (!bookingId || pageStatus === "failed") return;

    for (let attempt = 0; attempt < 8; attempt++) {
      await new Promise((r) => setTimeout(r, attempt === 0 ? 1000 : 2000));
      const data = await fetchBookingFromDB(bookingId);
      setPollCount(attempt + 1);

      if (!data) continue;
      setBooking(data);

      if (data.paymentStatus === "PAID") {
        setPageStatus("success");
        return;
      }
    }

    // If after 8 polls it's still not confirmed, show success anyway
    // (webhook may still be in-flight — the booking exists and payment intent succeeded)
    if (pageStatus !== "failed") {
      setPageStatus("success");
    }
  }, [bookingId, pageStatus]);

  useEffect(() => {
    if (pageStatus === "processing") {
      pollDB();
    }
  }, [pageStatus, pollDB]);

  // ── Format helpers ────────────────────────────────────────────────────────
  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });

  // ── Loading state ─────────────────────────────────────────────────────────
  if (pageStatus === "loading") {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-16 h-16 rounded-full bg-[#F5EDF4] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-[#724A6A] animate-spin" />
        </div>
        <h2 className="text-xl font-bold text-[#1A1A2E]">Verifying Payment…</h2>
        <p className="text-sm text-[#8A8AAA]">Please do not close this page.</p>
      </div>
    );
  }

  // ── Processing / polling state ────────────────────────────────────────────
  if (pageStatus === "processing") {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center shadow-[0_4px_20px_rgba(245,158,11,0.2)]">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
        </div>
        <h2 className="text-2xl font-bold text-[#1A1A2E]">Confirming Booking…</h2>
        <p className="text-sm text-[#8A8AAA] text-center max-w-xs">
          Payment received. We are confirming your booking — this usually takes a few seconds.
        </p>
        {pollCount > 3 && (
          <p className="text-xs text-[#8A8AAA] mt-2">Still working… ({pollCount}/8)</p>
        )}
      </div>
    );
  }

  // ── Success state ─────────────────────────────────────────────────────────
  if (pageStatus === "success") {
    return (
      <div className="max-w-md mx-auto py-12 px-4">
        <div className="bg-white rounded-3xl border border-[#E8E0D0] p-8 shadow-[0_8px_30px_rgba(114,74,106,0.08)] text-center">
          {/* Icon */}
          <div className="w-24 h-24 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-6 shadow-[0_4px_24px_rgba(16,185,129,0.25)]">
            <CheckCircle2 size={48} className="text-emerald-500" />
          </div>

          <h1 className="text-3xl font-black text-[#1A1A2E] mb-2">Booking Confirmed!</h1>
          <p className="text-[#4A4A6A] mb-8 leading-relaxed text-sm">
            Your payment was successful and your appointment has been booked. Check your email for a confirmation.
          </p>

          {/* Booking details card */}
          {booking && (
            <div className="bg-[#FDFBF7] rounded-2xl border border-[#F0EAD8] p-5 text-left mb-8 space-y-3">
              <p className="text-xs font-semibold text-[#8A8AAA] uppercase tracking-wider">Booking Details</p>
              <div className="flex justify-between items-center py-2 border-b border-[#F0EAD8]">
                <span className="text-sm text-[#8A8AAA]">Service</span>
                <span className="text-sm font-semibold text-[#1A1A2E]">{booking.service.title}</span>
              </div>
              {booking.providerSlot && (
                <>
                  <div className="flex justify-between items-center py-2 border-b border-[#F0EAD8]">
                    <span className="text-sm text-[#8A8AAA] flex items-center gap-1.5">
                      <Calendar size={13} /> Date
                    </span>
                    <span className="text-sm font-semibold text-[#1A1A2E]">
                      {formatDate(booking.providerSlot.startTime)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-[#8A8AAA] flex items-center gap-1.5">
                      <Clock size={13} /> Time
                    </span>
                    <span className="text-sm font-semibold text-[#1A1A2E]">
                      {formatTime(booking.providerSlot.startTime)} – {formatTime(booking.providerSlot.endTime)}
                    </span>
                  </div>
                </>
              )}
              <div className="flex justify-between items-center pt-2">
                <span className="text-sm text-[#8A8AAA]">Status</span>
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full">
                  <CheckCircle2 size={11} /> Confirmed
                </span>
              </div>
            </div>
          )}

          {/* CTAs */}
          <div className="space-y-3">
            <Link
              href="/dashboard"
              className="btn-primary w-full py-4 rounded-2xl flex items-center justify-center gap-2 font-bold"
            >
              View My Bookings
              <ChevronRight size={18} />
            </Link>
            <Link
              href="/services"
              className="btn-outline w-full py-4 rounded-2xl flex items-center justify-center gap-2"
            >
              Book Another Service
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Failed state ──────────────────────────────────────────────────────────
  return (
    <div className="max-w-md mx-auto py-12 px-4">
      <div className="bg-white rounded-3xl border border-[#E8E0D0] p-8 shadow-[0_8px_30px_rgba(114,74,106,0.08)] text-center">
        {/* Icon */}
        <div className="w-24 h-24 rounded-full bg-rose-50 flex items-center justify-center mx-auto mb-6 shadow-[0_4px_24px_rgba(244,63,94,0.2)]">
          <XCircle size={48} className="text-rose-500" />
        </div>

        <h1 className="text-3xl font-black text-[#1A1A2E] mb-2">Payment Failed</h1>
        <p className="text-[#4A4A6A] mb-8 leading-relaxed text-sm">{errorMessage}</p>

        {/* Info box */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8 text-left flex gap-3">
          <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-amber-800 mb-1">Your slot is still reserved</p>
            <p className="text-xs text-amber-700 leading-relaxed">
              We have held your time slot. Go to your dashboard to retry payment before it expires.
            </p>
          </div>
        </div>

        {/* CTAs */}
        <div className="space-y-3">
          <Link
            href="/dashboard"
            className="btn-primary w-full py-4 rounded-2xl flex items-center justify-center gap-2 font-bold"
          >
            Go to My Dashboard
            <ChevronRight size={18} />
          </Link>
          {bookingId && (
            <Link
              href={`/book/${bookingId ? encodeURIComponent(bookingId) : ""}`}
              className="btn-outline w-full py-4 rounded-2xl flex items-center justify-center gap-2"
            >
              <RefreshCcw size={16} />
              Retry Payment
            </Link>
          )}
          <Link
            href="/"
            className="flex items-center justify-center gap-1.5 text-sm text-[#8A8AAA] hover:text-[#724A6A] transition-colors py-2"
          >
            <Home size={14} />
            Return to Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Page wrapper (Stripe Elements required for useStripe hook) ───────────────

export default function PaymentStatusPage() {
  return (
    <div className="min-h-screen bg-[#FFFBE9] pt-20">
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-12 h-12 text-[#724A6A] animate-spin" />
          </div>
        }
      >
        <Elements stripe={getStripe()}>
          <PaymentStatusContent />
        </Elements>
      </Suspense>
    </div>
  );
}
