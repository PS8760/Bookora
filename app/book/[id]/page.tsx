"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";
import { useParams, useSearchParams } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { etagFetcher, clearETagCache, SLOT_REFRESH_MS } from "@/lib/realtime";
import { Calendar, ChevronLeft, Lock, Check, Frown, Clock, Users, Phone, Mail, FileText, AlertCircle, ShieldCheck, CreditCard } from "lucide-react";
import { Elements } from "@stripe/react-stripe-js";
import { getStripe } from "@/lib/stripe-client";
import { OrderSummary } from "@/components/payment/order-summary";
import { CheckoutForm } from "@/components/payment/checkout-form";

const STEPS = ["Select Slot", "Your Details", "Review", "Payment"];
const DAYS  = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const today = new Date();
today.setHours(0, 0, 0, 0);

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

interface ServiceInfo {
  id: string;
  title: string;
  description: string | null;
  icon: string | null;
  durationMinutes: number;
  paymentAmount: string | null;
  currency: string;
  advancePayment: boolean;
  manualConfirm: boolean;
  maxPerSlot: number;
  organiser: { name: string };
  questions?: Question[];
}

interface Question {
  id: string;
  text: string;
  type: "TEXT" | "MULTIPLE_CHOICE" | "BOOLEAN" | "NUMBER";
  required: boolean;
  order: number;
  options: { id: string; label: string; order: number }[];
}

interface Slot {
  id: string;
  time: string;
  startUtc?: string;
  available: boolean;
  remainingCapacity: number;
  maxCapacity: number;
  version?: number;
  providerId?: string;
  providerName?: string;
}

export default function BookingPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const shareToken = searchParams.get("share");
  const rescheduleBookingId = searchParams.get("reschedule");
  const { data: session, isPending } = useSession();

  const [step, setStep]                   = useState(0);
  const [selectedDate, setSelectedDate]   = useState<Date | null>(null);
  const [currentMonth, setCurrentMonth]   = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedProviderId, setSelectedProviderId] = useState<string>("all");
  const [selectedSlot, setSelectedSlot]   = useState<Slot | null>(null);
  const [capacity, setCapacity]           = useState(1);
  const [form, setForm]                   = useState({ name: "", email: "", phone: "", notes: "" });
  const [answers, setAnswers]             = useState<Record<string, { answerText?: string; selectedOptionId?: string }>>({});
  const [confirmed, setConfirmed]         = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<any>(null);
  const [loading, setLoading]             = useState(false);
  const [bookingError, setBookingError]   = useState("");
  const [clientSecret, setClientSecret]   = useState<string | null>(null);
  const [paymentData, setPaymentData]     = useState<any>(null);

  // Service data
  const [service, setService]             = useState<ServiceInfo | null>(null);
  const [serviceLoading, setServiceLoading] = useState(true);
  const [serviceError, setServiceError]   = useState("");

  // Slots data
  const [slots, setSlots]               = useState<Slot[]>([]);
  const [prevSlots, setPrevSlots]       = useState<Record<string, number>>({});
  const [updatedSlotIds, setUpdatedSlotIds] = useState<Set<string>>(new Set());
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError]     = useState("");

  // Refs for polling — stable, no re-render on change
  const intervalRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const isHiddenRef     = useRef(false);
  const selectedDateRef = useRef<Date | null>(null);

  const daysInMonth = getDaysInMonth(currentMonth.getFullYear(), currentMonth.getMonth());
  const firstDay = getFirstDayOfMonth(currentMonth.getFullYear(), currentMonth.getMonth());
  const monthDays = Array.from({ length: daysInMonth }, (_, i) => new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i + 1));
  const blanks = Array.from({ length: firstDay }, (_, i) => i);

  const prevMonth = () => {
    const newMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
    if (newMonth.getTime() >= new Date(today.getFullYear(), today.getMonth(), 1).getTime()) {
      setCurrentMonth(newMonth);
    }
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  // ── Service fetch ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!params.id) return;
    setServiceLoading(true);
    const query = shareToken ? `?share=${encodeURIComponent(shareToken)}` : "";
    fetch(`/api/appointments/${params.id}${query}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.data) setService(j.data);
        else setServiceError(j.error?.message ?? "Service not found.");
      })
      .catch(() => setServiceError("Failed to load service."))
      .finally(() => setServiceLoading(false));
  }, [params.id, shareToken]);

  // ── Smart slot polling ─────────────────────────────────────────────────────
  // Uses ETag-aware fetcher: sends If-None-Match, skips JSON parse on 304.
  // Pauses when the browser tab is hidden to save bandwidth and DB load.
  // Resumes immediately when the tab becomes visible again.
  const pollSlots = useCallback(
    async (date: Date, isInitial = false) => {
      if (!params.id || isHiddenRef.current) return;
      if (isInitial) { setSlotsLoading(true); setSlotsError(""); }

      const dateStr = date.toISOString().slice(0, 10);
      const query   = new URLSearchParams({ date: dateStr });
      if (shareToken) query.set("share", shareToken);
      const url = `/api/appointments/${params.id}/slots?${query.toString()}`;

      try {
        const j = await etagFetcher<{ data?: Slot[] }>(url);
        if (j.data) {
          // Detect changes for pulse animation
          const newUpdatedIds = new Set<string>();
          j.data.forEach((slot: Slot) => {
            const prevRemaining = prevSlots[slot.id];
            if (prevRemaining !== undefined && prevRemaining !== slot.remainingCapacity) {
              newUpdatedIds.add(slot.id);
            }
          });

          if (newUpdatedIds.size > 0) {
            setUpdatedSlotIds(newUpdatedIds);
            setTimeout(() => setUpdatedSlotIds(new Set()), 1000); // Clear pulse after 1s
          }

          // Update prevSlots map
          const nextPrevSlots: Record<string, number> = {};
          j.data.forEach((s: Slot) => { nextPrevSlots[s.id] = s.remainingCapacity; });
          setPrevSlots(nextPrevSlots);

          setSlots(j.data);
          setSlotsError("");
          // Validate selected slot against fresh data — deselect if taken
          setSelectedSlot((prev) => {
            if (!prev) return prev;
            const fresh = j.data!.find((s) => s.id === prev.id);
            if (!fresh || fresh.remainingCapacity < 1) return null;
            if (fresh.remainingCapacity !== prev.remainingCapacity) return fresh;
            return prev;
          });
        }
      } catch (err) {
        if (isInitial) {
          setSlotsError(err instanceof Error ? err.message : "Failed to load available times.");
          setSlots([]);
        }
        // Background poll errors are silent — keep showing existing slots
      } finally {
        if (isInitial) setSlotsLoading(false);
      }
    },
    [params.id, shareToken]
  );

  // Start/stop polling when selected date changes OR when step changes
  // Only poll on step 0 — no need to poll while user fills form or reviews
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (!selectedDate || step !== 0) return;

    selectedDateRef.current = selectedDate;
    setSelectedSlot(null);
    pollSlots(selectedDate, true);

    intervalRef.current = setInterval(() => {
      if (selectedDateRef.current) pollSlots(selectedDateRef.current);
    }, SLOT_REFRESH_MS);

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [selectedDate, step, pollSlots]);

  // Pause polling when tab is hidden, resume immediately when visible
  useEffect(() => {
    const onVisibility = () => {
      isHiddenRef.current = document.hidden;
      if (!document.hidden && selectedDateRef.current) {
        pollSlots(selectedDateRef.current, false);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [pollSlots]);

  // Keep capacity within available range when slots update
  useEffect(() => {
    if (!selectedSlot) return;
    if (capacity > selectedSlot.remainingCapacity) {
      setCapacity(Math.max(1, selectedSlot.remainingCapacity));
    }
  }, [selectedSlot, capacity]);

  // Auto-fill form from session
  useEffect(() => {
    if (session?.user) {
      setForm((f) => ({
        ...f,
        name: f.name || session.user.name || "",
        email: f.email || session.user.email || "",
      }));
    }
  }, [session]);

  const handleConfirm = async () => {
    if (!selectedSlot || !service) return;
    setLoading(true);
    setBookingError("");
    try {
      const isRescheduleFlow = Boolean(rescheduleBookingId);
      const endpoint = isRescheduleFlow
        ? `/api/bookings/${rescheduleBookingId}/reschedule`
        : "/api/bookings";
      const payload = isRescheduleFlow
        ? { newSlotId: selectedSlot.id, reason: "Customer self-service reschedule" }
        : {
            slotId: selectedSlot.id,
            appointmentId: params.id,
            providerId: selectedSlot.providerId ?? null,
            capacityRequested: capacity,
            idempotencyKey: uuidv4(),
            slotVersion: selectedSlot.version ?? undefined,
            formAnswers: {
              name: form.name,
              email: form.email,
              phone: form.phone,
              notes: form.notes,
            },
            questionAnswers: Object.entries(answers).map(([questionId, answer]) => ({
              questionId,
              ...answer,
            })),
          };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await res.json();
      if (!res.ok) {
        // ... (existing error handling)
        const errorCode = j.error?.code;
        const errorMsg = j.error?.message ?? "Booking failed. Please try again.";

        if (errorCode === "CAPACITY_EXCEEDED" || errorCode === "SLOT_PAST") {
          setBookingError(
            errorCode === "CAPACITY_EXCEEDED"
              ? "This slot was just taken! We've refreshed available times — please pick another."
              : "This slot has passed. Please choose a different time."
          );
          setSelectedSlot(null);
          setStep(0);
          if (selectedDate) {
            const dateStr = selectedDate.toISOString().slice(0, 10);
            clearETagCache(`/api/appointments/${params.id}/slots?date=${dateStr}`);
            pollSlots(selectedDate, true);
          }
        } else {
          setBookingError(errorMsg);
          if (selectedDate) {
            const dateStr = selectedDate.toISOString().slice(0, 10);
            clearETagCache(`/api/appointments/${params.id}/slots?date=${dateStr}`);
            pollSlots(selectedDate, false);
          }
        }
        return;
      }

      // If we got a clientSecret, move to payment step
      if (j.clientSecret) {
        setClientSecret(j.clientSecret);
        setConfirmedBooking(j.data);
        setPaymentData({
          bookingId: j.data.id,
          amount: j.payment.amount,
          currency: j.payment.currency,
        });
        setStep(3); // Payment step
      } else {
        setConfirmedBooking(j.data);
        setConfirmed(true);
      }
    } catch {
      setBookingError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = () => {
    if (!service?.advancePayment || !service?.paymentAmount) return "Free";
    const sym = service.currency === "INR" ? "₹" : service.currency;
    return `${sym}${parseFloat(service.paymentAmount).toLocaleString("en-IN")}`;
  };

  // Loading state
  if (isPending || serviceLoading) {
    return (
      <div className="min-h-screen bg-[#FFFBE9] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#724A6A] border-t-transparent animate-spin" />
      </div>
    );
  }

  // Service not found
  if (serviceError) {
    return (
      <div className="min-h-screen bg-[#FFFBE9] flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 rounded-full bg-[#FFEBEE] flex items-center justify-center mx-auto mb-6">
            <Frown size={48} className="text-[#C62828]" />
          </div>
          <h2 className="text-2xl font-bold text-[#1A1A2E] mb-2">Service not found</h2>
          <p className="text-sm text-[#4A4A6A] mb-8 leading-relaxed">{serviceError}</p>
          <Link href="/services" className="btn-primary py-3 px-8 rounded-xl shadow-lg">Browse Services</Link>
        </div>
      </div>
    );
  }

  // Not logged in
  if (!session?.user) {
    return (
      <div className="min-h-screen bg-[#FFFBE9] flex items-center justify-center px-4 py-20">
        <div className="max-w-sm w-full text-center">
          <div className="w-16 h-16 rounded-full bg-[#F5EDF4] flex items-center justify-center mx-auto mb-5">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#724A6A" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-[#1A1A2E] mb-2">Login Required</h2>
          <p className="text-[#4A4A6A] text-sm mb-7 leading-relaxed">
            You need to be signed in to book an appointment.
          </p>
          <div className="flex flex-col gap-3">
            <Link
              href={`/login?callbackUrl=${encodeURIComponent(
                `/book/${params.id}${shareToken ? `?share=${encodeURIComponent(shareToken)}` : ""}`
              )}`}
              className="btn-primary w-full py-3 rounded-xl text-center"
            >
              Sign In
            </Link>
            <Link
              href={`/register?callbackUrl=${encodeURIComponent(
                `/book/${params.id}${shareToken ? `?share=${encodeURIComponent(shareToken)}` : ""}`
              )}`}
              className="btn-outline w-full py-3 rounded-xl text-center"
            >
              Create Account
            </Link>
            <Link href="/services" className="text-sm text-[#8A8AAA] hover:text-[#724A6A] transition-colors mt-1">
              ← Back to Services
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Booking confirmed
  if (confirmed && confirmedBooking) {
    const slotDate = confirmedBooking.providerSlot?.startTime
      ? new Date(confirmedBooking.providerSlot.startTime)
      : null;
    return (
      <div className="min-h-screen bg-[#FFFBE9] flex items-center justify-center px-4 py-20">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full bg-[#E8F5E9] flex items-center justify-center mx-auto mb-6 shadow-[0_4px_20px_rgba(46,125,50,0.2)]">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#2E7D32" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-[#1A1A2E] mb-3">
            {confirmedBooking.status === "PENDING" ? "Appointment Reserved" : "Appointment Confirmed"}
          </h1>
          {confirmedBooking.status === "PENDING" && (
            <p className="text-sm text-[#E65100] bg-[#FFF3E0] border border-[#FFCC80] rounded-xl px-4 py-2.5 mb-4">
              ⏳ You will get a mail when the organiser confirms your booking
            </p>
          )}
          <div className="bg-white rounded-2xl border border-[#E8E0D0] p-6 text-left mb-5 shadow-[0_4px_20px_rgba(114,74,106,0.08)]">
            <div className="space-y-3">
              <div className="flex justify-between items-start py-2 border-b border-[#F0EAD8]">
                <span className="text-sm text-[#8A8AAA]">Time</span>
                <div className="text-right">
                  <p className="text-sm font-semibold text-[#1A1A2E]">
                    {slotDate
                      ? slotDate.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" }) + ", " +
                        slotDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
                      : "—"}
                  </p>
                  {slotDate && (
                    <div className="flex gap-2 mt-1.5 justify-end">
                      {(() => {
                        const start = slotDate.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
                        const end = new Date(slotDate.getTime() + (service?.durationMinutes ?? 30) * 60000)
                          .toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
                        const title = encodeURIComponent(service?.title ?? "Appointment");
                        const loc   = encodeURIComponent(service?.venue ?? "");
                        const gCal  = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&location=${loc}`;
                        const iCal  = `data:text/calendar;charset=utf8,BEGIN:VCALENDAR%0AVERSION:2.0%0ABEGIN:VEVENT%0ADTSTART:${start}%0ADTEND:${end}%0ASUMMARY:${title}%0ALOCATION:${loc}%0AEND:VEVENT%0AEND:VCALENDAR`;
                        return (
                          <>
                            <a href={gCal} target="_blank" rel="noreferrer"
                              className="text-[10px] font-semibold px-2 py-1 rounded-lg bg-[#E8F5E9] text-[#2E7D32] hover:bg-[#C8E6C9] transition-colors">
                              Google Calendar
                            </a>
                            <a href={iCal} download="booking.ics"
                              className="text-[10px] font-semibold px-2 py-1 rounded-lg bg-[#E1F5FE] text-[#0277BD] hover:bg-[#B3E5FC] transition-colors">
                              iCal / Outlook
                            </a>
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-[#F0EAD8]">
                <span className="text-sm text-[#8A8AAA]">Duration</span>
                <span className="text-sm font-semibold text-[#1A1A2E]">{service?.durationMinutes ?? "—"} min</span>
              </div>
              {capacity > 1 && (
                <div className="flex justify-between items-center py-2 border-b border-[#F0EAD8]">
                  <span className="text-sm text-[#8A8AAA]">No. of people</span>
                  <span className="text-sm font-semibold text-[#1A1A2E]">{capacity}</span>
                </div>
              )}
              <div className="flex justify-between items-center py-2 border-b border-[#F0EAD8]">
                <span className="text-sm text-[#8A8AAA]">Status</span>
                <span className={`text-sm font-bold px-2.5 py-0.5 rounded-full ${
                  confirmedBooking.status === "PENDING"
                    ? "bg-[#FFF3E0] text-[#E65100]"
                    : "bg-[#E8F5E9] text-[#2E7D32]"
                }`}>
                  {confirmedBooking.status === "PENDING" ? "Pending Confirmation" : "Confirmed ✓"}
                </span>
              </div>
              {service?.venue && (
                <div className="flex justify-between items-start py-2 border-b border-[#F0EAD8]">
                  <span className="text-sm text-[#8A8AAA]">Venue</span>
                  <span className="text-sm font-semibold text-[#1A1A2E] text-right max-w-[55%]">{service.venue}</span>
                </div>
              )}
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-[#8A8AAA]">Service</span>
                <span className="text-sm font-semibold text-[#1A1A2E]">{service?.title ?? "—"}</span>
              </div>
            </div>
            {confirmedBooking.status !== "PENDING" && (service as any)?.confirmMessage && (
              <div className="mt-4 pt-4 border-t border-[#F0EAD8]">
                <p className="text-xs text-[#4A4A6A] leading-relaxed italic">💬 "{(service as any).confirmMessage}"</p>
              </div>
            )}
          </div>
          <div className="flex gap-3 mb-4">
            <Link href={`/book/${params.id}`}
              className="flex-1 py-3 rounded-xl border-2 border-[#E8E0D0] text-sm font-semibold text-[#4A4A6A] hover:bg-[#FFEBEE] hover:text-[#C62828] hover:border-[#EF9A9A] transition-all text-center">
              Cancel
            </Link>
            <Link href={`/book/${params.id}?reschedule=${confirmedBooking.id}`}
              className="flex-1 py-3 rounded-xl border-2 border-[#724A6A]/30 text-sm font-semibold text-[#724A6A] hover:bg-[#F5EDF4] transition-all text-center">
              Reschedule
            </Link>
          </div>
          <div className="flex flex-col gap-3 mb-4">
            <Link href="/dashboard" className="btn-primary w-full py-3 rounded-xl text-center">
              View My Bookings
            </Link>
            <Link href={`/dashboard/messages?bookingId=${confirmedBooking.id}`} className="btn-outline w-full py-3 rounded-xl text-center bg-white border-[#724A6A] text-[#724A6A] hover:bg-[#F5EDF4]">
              Message Organiser
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Main booking flow
  return (
    <div className="min-h-screen bg-[#FFFBE9] pt-20">
      {/* Header */}
      <div className="bg-[#FFF3C4]/40 border-b border-[#E8E0D0] py-6">
        <div className="page-container">
          <div className="flex items-center gap-3 mb-4">
            <Link href="/services" className="text-sm text-[#724A6A] hover:underline flex items-center gap-1 font-medium transition-colors">
              <ChevronLeft size={16} />
              Back to Services
            </Link>
            <span className="text-[#D4B8CF]">/</span>
            <span className="text-sm text-[#4A4A6A] font-medium">{service?.title ?? "Book Appointment"}</span>
          </div>

          {/* Progress steps */}
          <div className="flex items-center gap-2">
            {STEPS.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className={`flex items-center gap-2 ${i <= step ? "text-[#724A6A]" : "text-[#8A8AAA]"}`}>
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                      i < step
                        ? "bg-[#724A6A] text-white"
                        : i === step
                        ? "bg-[#724A6A] text-white ring-4 ring-[#724A6A]/20"
                        : "bg-[#E8E0D0] text-[#8A8AAA]"
                    }`}
                  >
                    {i < step ? <Check size={14} /> : i + 1}
                  </div>
                  <span className="text-sm font-medium hidden sm:block">{s}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`h-0.5 w-8 sm:w-16 rounded transition-all ${
                      i < step ? "bg-[#724A6A]" : "bg-[#E8E0D0]"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="page-container py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main panel */}
          <div className="lg:col-span-2">

            {/* Step 0: Select Slot */}
            {step === 0 && (
              <div className="bg-white rounded-2xl border border-[#E8E0D0] p-6 shadow-[0_2px_12px_rgba(114,74,106,0.06)]">
                <h2 className="text-xl font-bold text-[#1A1A2E] mb-6">Choose a Date &amp; Time</h2>

                {/* Intro Message */}
                {(service as any)?.introMessage && (
                  <div className="mb-6 p-4 bg-[#F5EDF4]/50 border border-[#D4B8CF]/40 rounded-xl">
                    <p className="text-sm text-[#4A4A6A] leading-relaxed italic">
                      "{(service as any).introMessage}"
                    </p>
                  </div>
                )}

                {/* Calendar */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-semibold text-[#4A4A6A]">Select Date</p>
                    <div className="flex items-center gap-3">
                      <button onClick={prevMonth} disabled={currentMonth.getTime() <= new Date(today.getFullYear(), today.getMonth(), 1).getTime()} className="p-1 hover:bg-[#F5EDF4] rounded-lg disabled:opacity-30 transition-colors">
                        <ChevronLeft size={20} className="text-[#1A1A2E]" />
                      </button>
                      <span className="font-semibold text-[#1A1A2E] text-sm w-32 text-center">
                        {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                      </span>
                      <button onClick={nextMonth} className="p-1 hover:bg-[#F5EDF4] rounded-lg transition-colors">
                        <ChevronLeft size={20} className="text-[#1A1A2E] rotate-180" />
                      </button>
                    </div>
                  </div>

                  <div className="bg-[#FFFBE9]/50 rounded-2xl border border-[#E8E0D0] p-4 sm:p-6 shadow-[0_2px_8px_rgba(114,74,106,0.03)]">
                    <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
                      {DAYS.map(d => (
                        <div key={d} className="text-center text-[10px] sm:text-xs font-semibold text-[#8A8AAA] uppercase tracking-wider py-2">
                          {d}
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1 sm:gap-2">
                      {blanks.map(b => (
                        <div key={`blank-${b}`} className="aspect-square" />
                      ))}
                      {monthDays.map((d, i) => {
                        const isSelected = selectedDate?.toDateString() === d.toDateString();
                        const isPast = d.getTime() < today.getTime();
                        
                        return (
                          <button
                            key={i}
                            disabled={isPast}
                            onClick={() => { setSelectedDate(d); setSelectedProviderId("all"); }}
                            className={`aspect-square flex items-center justify-center rounded-xl sm:rounded-2xl text-sm sm:text-base font-medium transition-all ${
                              isSelected
                                ? "bg-[#724A6A] text-white shadow-[0_4px_12px_rgba(114,74,106,0.3)] ring-2 ring-[#724A6A] ring-offset-2 ring-offset-[#FFFBE9]"
                                : isPast
                                ? "text-[#D4B8CF] cursor-not-allowed"
                                : "bg-white text-[#1A1A2E] border border-[#E8E0D0] hover:border-[#724A6A] hover:text-[#724A6A] shadow-[0_2px_4px_rgba(114,74,106,0.04)] hover:shadow-[0_4px_8px_rgba(114,74,106,0.1)]"
                            }`}
                          >
                            {d.getDate()}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Time slots */}
                {selectedDate && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-semibold text-[#4A4A6A]">Available Times</p>
                      {!slotsLoading && slots.length > 0 && (
                        <span className="flex items-center gap-1.5 text-[10px] text-[#2E7D32] font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#2E7D32] animate-pulse" />
                          Live
                        </span>
                      )}
                    </div>

                    {/* Provider Picker (With) */}
                    {!slotsLoading && slots.length > 0 && (() => {
                      const providers = Array.from(
                        new Map(
                          slots
                            .filter((s) => s.providerId && s.providerName)
                            .map((s) => [s.providerId, s.providerName])
                        ).entries()
                      );
                      
                      if (providers.length > 0) {
                        return (
                          <div className="mb-4 flex items-center gap-3">
                            <span className="text-sm font-semibold text-[#8A8AAA]">With:</span>
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() => setSelectedProviderId("all")}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                                  selectedProviderId === "all"
                                    ? "bg-[#724A6A] text-white border-[#724A6A]"
                                    : "bg-white text-[#4A4A6A] border-[#E8E0D0] hover:border-[#724A6A]"
                                }`}
                              >
                                Anyone
                              </button>
                              {providers.map(([pId, pName]) => (
                                <button
                                  key={pId}
                                  onClick={() => setSelectedProviderId(pId)}
                                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                                    selectedProviderId === pId
                                      ? "bg-[#724A6A] text-white border-[#724A6A]"
                                      : "bg-white text-[#4A4A6A] border-[#E8E0D0] hover:border-[#724A6A]"
                                  }`}
                                >
                                  {pName}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}

                    {slotsLoading && (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {Array.from({ length: 8 }).map((_, i) => (
                          <div key={i} className="h-10 rounded-xl bg-[#F0EAD8] animate-pulse" />
                        ))}
                      </div>
                    )}

                    {slotsError && (
                      <p className="text-sm text-[#C62828] bg-[#FFEBEE] px-3 py-2 rounded-lg">{slotsError}</p>
                    )}

                    {!slotsLoading && !slotsError && slots.filter(s => selectedProviderId === "all" || s.providerId === selectedProviderId).length === 0 && (
                      <p className="text-sm text-[#8A8AAA] py-4 text-center border-2 border-dashed border-[#E8E0D0] rounded-xl bg-[#FFFBE9]/50">
                        No available slots for this selection. Try another day or provider.
                      </p>
                    )}

                    {!slotsLoading && slots.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {slots
                          .filter(s => selectedProviderId === "all" || s.providerId === selectedProviderId)
                          .map((slot) => {
                            const isFlexible = slot.time.includes(" - ");
                            return (
                              <button
                                key={slot.id}
                                disabled={!slot.available || slot.remainingCapacity < 1}
                                onClick={() => setSelectedSlot(slot)}
                                className={`flex flex-col items-center justify-center py-3 px-3 rounded-xl text-sm font-medium border-2 transition-all relative overflow-hidden ${
                                  updatedSlotIds.has(slot.id) ? "slot-pulse" : ""
                                } ${
                                  !slot.available || slot.remainingCapacity < 1
                                    ? "border-[#F0EAD8] bg-[#F9F5F0] text-[#C0B8B0] cursor-not-allowed line-through"
                                    : selectedSlot?.id === slot.id
                                    ? "border-[#724A6A] bg-[#724A6A] text-white shadow-md transform scale-[1.02]"
                                    : isFlexible 
                                      ? "border-[#D4B8CF]/50 bg-[#F5EDF4]/30 text-[#4A4A6A] hover:border-[#724A6A] hover:text-[#724A6A] hover:bg-[#F5EDF4]"
                                      : "border-[#E8E0D0] bg-[#FFFBE9] text-[#4A4A6A] hover:border-[#724A6A] hover:text-[#724A6A] hover:bg-white"
                                }`}
                              >
                                {isFlexible ? (
                                  <div className="flex items-center gap-1.5">
                                    <span>{slot.time.split(" - ")[0]}</span>
                                    <span className="opacity-50">→</span>
                                    <span>{slot.time.split(" - ")[1]}</span>
                                  </div>
                                ) : (
                                  <span>{slot.time}</span>
                                )}
                                <div className="flex items-center gap-2 mt-1">
                                  <span className={`text-[10px] font-bold ${
                                    selectedSlot?.id === slot.id 
                                      ? "text-white/90" 
                                      : slot.remainingCapacity <= 2 
                                      ? "text-[#C62828]" 
                                      : "text-[#724A6A]"
                                  }`}>
                                    {slot.remainingCapacity} left
                                  </span>
                                  {slot.providerName && selectedProviderId === "all" && (
                                    <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider ${
                                      selectedSlot?.id === slot.id ? "bg-white/20 text-white" : "bg-[#E8E0D0] text-[#8A8AAA]"
                                    }`}>
                                      {slot.providerName}
                                    </span>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                      </div>
                    )}
                  </div>
                )}

                {/* Capacity */}
                {selectedSlot && (service?.maxPerSlot ?? 1) > 1 && (
                  <div className="mt-6 p-4 bg-[#FFFBE9] rounded-xl border border-[#E8E0D0]">
                    <p className="text-sm font-semibold text-[#4A4A6A] mb-3">Number of People</p>
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => setCapacity(Math.max(1, capacity - 1))}
                        className="w-9 h-9 rounded-xl border border-[#E8E0D0] bg-white flex items-center justify-center text-[#724A6A] font-bold hover:bg-[#F5EDF4] transition-colors"
                      >
                        −
                      </button>
                      <span className="text-xl font-bold text-[#1A1A2E] w-8 text-center">{capacity}</span>
                      <button
                        onClick={() => setCapacity(Math.min(selectedSlot.remainingCapacity, capacity + 1))}
                        className="w-9 h-9 rounded-xl border border-[#E8E0D0] bg-white flex items-center justify-center text-[#724A6A] font-bold hover:bg-[#F5EDF4] transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>
                )}

                <button
                  disabled={!selectedDate || !selectedSlot}
                  onClick={() => setStep(1)}
                  className="btn-primary w-full py-3 rounded-xl mt-6 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Continue →
                </button>
              </div>
            )}

            {/* Step 1: Details */}
            {step === 1 && (
              <div className="bg-white rounded-2xl border border-[#E8E0D0] p-6 shadow-[0_2px_12px_rgba(114,74,106,0.06)]">
                <h2 className="text-xl font-bold text-[#1A1A2E] mb-6">Your Details</h2>
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-[#1A1A2E] mb-1.5">Full Name *</label>
                    <input
                      className="input-base"
                      placeholder="Your full name"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[#1A1A2E] mb-1.5">Email *</label>
                    <input
                      type="email"
                      className="input-base"
                      placeholder="you@example.com"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[#1A1A2E] mb-1.5">Phone Number</label>
                    <input
                      type="tel"
                      className="input-base"
                      placeholder="+91 98765 43210"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[#1A1A2E] mb-1.5">Additional Notes</label>
                    <textarea
                      className="input-base resize-none"
                      rows={3}
                      placeholder="Any special requirements..."
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    />
                  </div>
                  {(service?.questions ?? []).length > 0 && (
                    <div className="pt-3 border-t border-[#F0EAD8]">
                      <h3 className="font-semibold text-[#1A1A2E] mb-3">Additional Questions</h3>
                      <div className="flex flex-col gap-4">
                        {(service?.questions ?? []).map((question) => (
                          <div key={question.id}>
                            <label className="block text-sm font-semibold text-[#1A1A2E] mb-1.5">
                              {question.text}{question.required ? " *" : ""}
                            </label>
                            {question.type === "MULTIPLE_CHOICE" ? (
                              <div className="flex flex-wrap gap-2">
                                {question.options.map((option) => (
                                  <button
                                    key={option.id}
                                    type="button"
                                    onClick={() => setAnswers({
                                      ...answers,
                                      [question.id]: { selectedOptionId: option.id, answerText: option.label },
                                    })}
                                    className={`px-3 py-2 rounded-xl border text-sm font-medium transition-all ${
                                      answers[question.id]?.selectedOptionId === option.id
                                        ? "border-[#724A6A] bg-[#F5EDF4] text-[#724A6A]"
                                        : "border-[#E8E0D0] bg-[#FFFBE9] text-[#4A4A6A] hover:border-[#724A6A]"
                                    }`}
                                  >
                                    {option.label}
                                  </button>
                                ))}
                              </div>
                            ) : question.type === "BOOLEAN" ? (
                              <div className="flex gap-2">
                                {["Yes", "No"].map((value) => (
                                  <button
                                    key={value}
                                    type="button"
                                    onClick={() => setAnswers({ ...answers, [question.id]: { answerText: value } })}
                                    className={`px-4 py-2 rounded-xl border text-sm font-medium ${
                                      answers[question.id]?.answerText === value
                                        ? "border-[#724A6A] bg-[#F5EDF4] text-[#724A6A]"
                                        : "border-[#E8E0D0] bg-[#FFFBE9] text-[#4A4A6A]"
                                    }`}
                                  >
                                    {value}
                                  </button>
                                ))}
                              </div>
                            ) : question.type === "NUMBER" ? (
                              <input
                                type="number"
                                className="input-base"
                                value={answers[question.id]?.answerText ?? ""}
                                onChange={(e) => setAnswers({ ...answers, [question.id]: { answerText: e.target.value } })}
                              />
                            ) : (
                              <textarea
                                className="input-base resize-none"
                                rows={2}
                                value={answers[question.id]?.answerText ?? ""}
                                onChange={(e) => setAnswers({ ...answers, [question.id]: { answerText: e.target.value } })}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex gap-3 mt-6">
                  <button onClick={() => setStep(0)} className="btn-outline flex-1 py-3 rounded-xl">
                    ← Back
                  </button>
                  <button
                    disabled={
                      !form.name ||
                      !form.email ||
                      (service?.questions ?? []).some((question) => question.required && !answers[question.id]?.answerText && !answers[question.id]?.selectedOptionId)
                    }
                    onClick={() => setStep(2)}
                    className="btn-primary flex-1 py-3 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Review →
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Confirm / Review */}
            {step === 2 && (
              <div className="bg-white rounded-2xl border border-[#E8E0D0] p-6 shadow-[0_2px_12px_rgba(114,74,106,0.06)]">
                <h2 className="text-xl font-bold text-[#1A1A2E] mb-6">Review &amp; Confirm</h2>
                <div className="space-y-3 mb-6">
                  {[
                    { label: "Service",  value: service?.title ?? "—" },
                    { label: "Provider", value: service?.organiser?.name ?? "—" },
                    {
                      label: "Date",
                      value: selectedDate
                        ? selectedDate.toLocaleDateString("en-IN", { weekday: "long", month: "long", day: "numeric" })
                        : "—",
                    },
                    { label: "Time",   value: selectedSlot?.time ?? "—" },
                    { label: "People", value: `${capacity} person${capacity > 1 ? "s" : ""}` },
                    { label: "Name",   value: form.name },
                    { label: "Email",  value: form.email },
                    { label: "Total",  value: formatPrice(), highlight: true },
                  ].map((item) => (
                    <div key={item.label} className="flex justify-between py-2.5 border-b border-[#F0EAD8] last:border-0">
                      <span className="text-sm text-[#8A8AAA]">{item.label}</span>
                      <span className={`text-sm font-semibold ${item.highlight ? "text-[#724A6A] text-base" : "text-[#1A1A2E]"}`}>
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>

                {service?.manualConfirm && (
                  <div className="p-4 bg-[#FFF3C4]/50 rounded-xl border border-[#FFE88A] mb-4">
                    <p className="text-xs text-[#4A4A6A] leading-relaxed">
                      ⏳ This service requires manual confirmation. The organiser will review and confirm your booking.
                    </p>
                  </div>
                )}

                {service?.advancePayment && (
                  <div className="p-4 bg-[#F5EDF4] rounded-xl border border-[#D4B8CF] mb-4">
                    <p className="text-xs text-[#4A4A6A] leading-relaxed">
                      This is a paid appointment. Secure payment via Stripe (UPI/Card) is required to confirm your booking.
                    </p>
                  </div>
                )}

                <div className="p-4 bg-[#FFF3C4]/50 rounded-xl border border-[#FFE88A] mb-6">
                  <p className="text-xs text-[#4A4A6A] leading-relaxed">
                    By confirming, you agree to our cancellation policy. Free cancellation up to 1 hour before your appointment.
                  </p>
                </div>

                {bookingError && (
                  <div className="mb-4 px-4 py-3 rounded-xl bg-[#FFEBEE] border border-[#C62828]/20 text-sm text-[#C62828] font-medium">
                    {bookingError}
                  </div>
                )}

                <div className="flex gap-3">
                  <button onClick={() => setStep(1)} className="btn-outline flex-1 py-3 rounded-xl">← Back</button>
                  <button
                    onClick={handleConfirm}
                    disabled={loading}
                    className="btn-primary flex-1 py-3 rounded-xl disabled:opacity-60"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2 justify-center">
                        <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                        </svg>
                        Processing...
                      </span>
                    ) : service?.advancePayment ? "Proceed to Payment →" : (rescheduleBookingId ? "Confirm Reschedule ✓" : "Confirm Booking ✓")}
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Payment */}
            {step === 3 && clientSecret && paymentData && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-[#724A6A] rounded-2xl p-6 text-white overflow-hidden relative">
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2">
                      <ShieldCheck className="w-5 h-5 text-[#D4B8CF]" />
                      <span className="text-xs font-bold uppercase tracking-widest text-[#D4B8CF]">Secure Checkout</span>
                    </div>
                    <h2 className="text-2xl font-bold">Complete your payment</h2>
                    <p className="text-[#D4B8CF] text-sm mt-1 opacity-90">Your booking is reserved. Complete the payment to confirm.</p>
                  </div>
                  {/* Decorative background circle */}
                  <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
                  <Elements 
                    stripe={getStripe()} 
                    options={{ 
                      clientSecret,
                      appearance: {
                        theme: 'stripe',
                        variables: {
                          colorPrimary: '#724A6A',
                          colorBackground: '#ffffff',
                          colorText: '#1A1A2E',
                          borderRadius: '16px',
                        }
                      }
                    }}
                  >
                    <CheckoutForm 
                      bookingId={paymentData.bookingId} 
                      amount={paymentData.amount} 
                      currency={paymentData.currency} 
                    />
                  </Elements>
                </div>

                <button 
                  onClick={() => setStep(2)} 
                  className="text-sm text-[#8A8AAA] hover:text-[#724A6A] font-medium transition-colors flex items-center gap-1.5 mx-auto"
                >
                  <ChevronLeft size={14} />
                  Cancel and go back
                </button>
              </div>
            )}
          </div>

          {/* Sidebar summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-[#E8E0D0] p-5 shadow-[0_2px_12px_rgba(114,74,106,0.06)] sticky top-24">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-[#F5EDF4] flex items-center justify-center text-2xl text-[#724A6A] overflow-hidden">
                  {service?.icon?.startsWith('/') || service?.icon?.startsWith('http') ? (
                    <img src={service.icon} alt={service.title} className="w-full h-full object-cover" />
                  ) : (
                    service?.icon || <Calendar size={24} />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-[#1A1A2E] text-sm leading-tight">{service?.title ?? "—"}</h3>
                  <p className="text-xs text-[#8A8AAA] flex items-center gap-1 mt-0.5">
                    <Users size={12} />
                    {service?.organiser?.name ?? "—"}
                  </p>
                </div>
              </div>
              <div className="divider mb-4" />
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#8A8AAA]">Duration</span>
                  <span className="font-medium text-[#1A1A2E]">{service?.durationMinutes ?? "—"} min</span>
                </div>
                {selectedDate && (
                  <div className="flex justify-between">
                    <span className="text-[#8A8AAA]">Date</span>
                    <span className="font-medium text-[#1A1A2E]">
                      {selectedDate.toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                    </span>
                  </div>
                )}
                {selectedSlot && (
                  <div className="flex justify-between">
                    <span className="text-[#8A8AAA]">Time</span>
                    <span className="font-medium text-[#1A1A2E]">{selectedSlot.time}</span>
                  </div>
                )}
                <div className="divider" />
                <div className="flex justify-between">
                  <span className="font-semibold text-[#1A1A2E]">Total</span>
                  <span className="font-bold text-[#724A6A] text-base">{formatPrice()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
