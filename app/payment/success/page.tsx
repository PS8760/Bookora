"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { showToast } from "@/components/ToastNotification";

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    const session_id = searchParams.get("session_id");
    setSessionId(session_id);

    if (session_id) {
      // Show success toast
      showToast({
        type: "success",
        title: "Payment Successful! 🎉",
        message: "Your booking has been confirmed. You'll receive a confirmation email shortly.",
        duration: 7000,
      });
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFFBE9] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#724A6A] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#4A4A6A]">Processing payment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFBE9] pt-24 pb-16">
      <div className="page-container max-w-2xl">
        {/* Success Icon */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 rounded-full bg-[#E8F5E9] flex items-center justify-center mx-auto mb-6 animate-bounce">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#2E7D32"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-[#1A1A2E] mb-3">
            Payment <span className="gradient-brand-text">Successful!</span>
          </h1>
          <p className="text-lg text-[#4A4A6A]">
            Your booking has been confirmed and payment processed successfully.
          </p>
        </div>

        {/* Details Card */}
        <div className="bg-white rounded-2xl border border-[#E8E0D0] shadow-[0_2px_12px_rgba(114,74,106,0.06)] p-8 mb-6">
          <div className="flex items-start gap-4 mb-6 pb-6 border-b border-[#E8E0D0]">
            <div className="w-12 h-12 rounded-xl bg-[#E8F5E9] flex items-center justify-center flex-shrink-0">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#2E7D32"
                strokeWidth="2"
              >
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                <line x1="1" y1="10" x2="23" y2="10" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-[#1A1A2E] mb-2">Payment Confirmed</h2>
              <p className="text-sm text-[#4A4A6A]">
                Your payment has been processed securely via Stripe.
              </p>
              {sessionId && (
                <p className="text-xs text-[#8A8AAA] mt-2 font-mono">
                  Session ID: {sessionId.slice(0, 20)}...
                </p>
              )}
            </div>
          </div>

          {/* What's Next */}
          <div className="space-y-4">
            <h3 className="font-semibold text-[#1A1A2E] mb-3">What happens next?</h3>
            
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-[#E1F5FE] flex items-center justify-center flex-shrink-0 text-sm font-bold text-[#0277BD]">
                1
              </div>
              <div>
                <p className="font-semibold text-sm text-[#1A1A2E]">Confirmation Email</p>
                <p className="text-xs text-[#4A4A6A] mt-1">
                  You'll receive a confirmation email with your booking details and receipt.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-[#E1F5FE] flex items-center justify-center flex-shrink-0 text-sm font-bold text-[#0277BD]">
                2
              </div>
              <div>
                <p className="font-semibold text-sm text-[#1A1A2E]">Organiser Notification</p>
                <p className="text-xs text-[#4A4A6A] mt-1">
                  The service provider has been notified and will prepare for your appointment.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-[#E1F5FE] flex items-center justify-center flex-shrink-0 text-sm font-bold text-[#0277BD]">
                3
              </div>
              <div>
                <p className="font-semibold text-sm text-[#1A1A2E]">Reminder</p>
                <p className="text-xs text-[#4A4A6A] mt-1">
                  We'll send you a reminder before your appointment.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => router.push("/dashboard/bookings")}
            className="btn-primary flex-1 py-3"
          >
            View My Bookings
          </button>
          <button
            onClick={() => router.push("/")}
            className="btn-outline flex-1 py-3"
          >
            Back to Home
          </button>
        </div>

        {/* Support */}
        <div className="mt-8 p-4 bg-[#E1F5FE] rounded-xl border border-[#0277BD] text-center">
          <p className="text-sm text-[#01579B]">
            Need help? <a href="/contact-admin" className="font-semibold hover:underline">Contact Support</a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#FFFBE9] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#724A6A] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#4A4A6A]">Loading...</p>
        </div>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
}
