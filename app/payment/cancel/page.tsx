"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { showToast } from "@/components/ToastNotification";

function PaymentCancelContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const bookingId = searchParams.get("booking_id");

  useEffect(() => {
    showToast({
      type: "warning",
      title: "Payment Cancelled",
      message: "Your payment was cancelled. You can try again anytime.",
      duration: 5000,
    });
  }, []);

  return (
    <div className="min-h-screen bg-[#FFFBE9] pt-24 pb-16">
      <div className="page-container max-w-2xl">
        {/* Cancel Icon */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 rounded-full bg-[#FFF3E0] flex items-center justify-center mx-auto mb-6">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#E65100"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-[#1A1A2E] mb-3">
            Payment <span className="text-[#E65100]">Cancelled</span>
          </h1>
          <p className="text-lg text-[#4A4A6A]">
            Your payment was cancelled. No charges were made to your account.
          </p>
        </div>

        {/* Info Card */}
        <div className="bg-white rounded-2xl border border-[#E8E0D0] shadow-[0_2px_12px_rgba(114,74,106,0.06)] p-8 mb-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 rounded-xl bg-[#FFF3E0] flex items-center justify-center flex-shrink-0">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#E65100"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-[#1A1A2E] mb-2">What happened?</h2>
              <p className="text-sm text-[#4A4A6A] mb-4">
                You cancelled the payment process before completing it. Your booking is still pending
                and requires payment to be confirmed.
              </p>
              <div className="p-3 bg-[#FFFBE9] rounded-lg border border-[#E8E0D0]">
                <p className="text-xs text-[#4A4A6A]">
                  <strong>Note:</strong> Your booking slot is temporarily reserved. Please complete
                  the payment within 24 hours to confirm your booking.
                </p>
              </div>
            </div>
          </div>

          {/* Options */}
          <div className="space-y-3 pt-6 border-t border-[#E8E0D0]">
            <h3 className="font-semibold text-[#1A1A2E] mb-3">What would you like to do?</h3>

            <div className="flex gap-3 items-start p-4 rounded-xl border-2 border-[#E8E0D0] hover:border-[#724A6A] transition-colors">
              <div className="w-8 h-8 rounded-lg bg-[#E8F5E9] flex items-center justify-center flex-shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2E7D32" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm text-[#1A1A2E]">Try Payment Again</p>
                <p className="text-xs text-[#4A4A6A] mt-1">
                  Complete your booking by making the payment now
                </p>
              </div>
            </div>

            <div className="flex gap-3 items-start p-4 rounded-xl border-2 border-[#E8E0D0] hover:border-[#724A6A] transition-colors">
              <div className="w-8 h-8 rounded-lg bg-[#E1F5FE] flex items-center justify-center flex-shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0277BD" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm text-[#1A1A2E]">View My Bookings</p>
                <p className="text-xs text-[#4A4A6A] mt-1">
                  Check your pending bookings and payment status
                </p>
              </div>
            </div>

            <div className="flex gap-3 items-start p-4 rounded-xl border-2 border-[#E8E0D0] hover:border-[#724A6A] transition-colors">
              <div className="w-8 h-8 rounded-lg bg-[#FFF3E0] flex items-center justify-center flex-shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E65100" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm text-[#1A1A2E]">Cancel Booking</p>
                <p className="text-xs text-[#4A4A6A] mt-1">
                  Cancel this booking and release the slot
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          {bookingId && (
            <button
              onClick={() => router.push(`/bookings/${bookingId}/payment`)}
              className="btn-primary flex-1 py-3"
            >
              Try Payment Again
            </button>
          )}
          <button
            onClick={() => router.push("/dashboard/bookings")}
            className="btn-outline flex-1 py-3"
          >
            View My Bookings
          </button>
        </div>

        {/* Support */}
        <div className="mt-8 p-4 bg-[#E1F5FE] rounded-xl border border-[#0277BD] text-center">
          <p className="text-sm text-[#01579B]">
            Having trouble with payment? <a href="/contact-admin" className="font-semibold hover:underline">Contact Support</a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function PaymentCancelPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#FFFBE9] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#724A6A] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#4A4A6A]">Loading...</p>
        </div>
      </div>
    }>
      <PaymentCancelContent />
    </Suspense>
  );
}
