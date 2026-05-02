"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useStripe } from "@stripe/react-stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { getStripe } from "@/lib/stripe-client";
import { CheckCircle2, XCircle, Loader2, ChevronRight, Calendar, ArrowLeft } from "lucide-react";
import Link from "next/link";

function PaymentStatusContent() {
  const stripe = useStripe();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [status, setStatus] = useState<"loading" | "success" | "processing" | "error">("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(searchParams.get("bookingId"));

  useEffect(() => {
    if (!stripe) return;

    const clientSecret = searchParams.get("payment_intent_client_secret");
    if (!clientSecret) {
      setStatus("error");
      setMessage("No payment information found.");
      return;
    }

    stripe.retrievePaymentIntent(clientSecret).then(({ paymentIntent }) => {
      switch (paymentIntent?.status) {
        case "succeeded":
          setStatus("success");
          setMessage("Payment successful! Your booking is now confirmed.");
          break;
        case "processing":
          setStatus("processing");
          setMessage("Your payment is processing. We'll update your booking status once it completes.");
          break;
        case "requires_payment_method":
          setStatus("error");
          setMessage("Your payment was not successful, please try again.");
          break;
        default:
          setStatus("error");
          setMessage("Something went wrong.");
          break;
      }
    });
  }, [stripe, searchParams]);

  if (status === "loading") {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-12 h-12 text-[#724A6A] animate-spin mb-4" />
        <h2 className="text-xl font-bold text-[#1A1A2E]">Verifying Payment...</h2>
        <p className="text-sm text-[#8A8AAA] mt-2">Please do not refresh the page.</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto py-12 px-4">
      <div className="bg-white rounded-3xl border border-[#E8E0D0] p-8 shadow-[0_8px_30px_rgba(114,74,106,0.08)] text-center">
        {status === "success" ? (
          <>
            <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-6 shadow-[0_4px_20px_rgba(16,185,129,0.2)]">
              <CheckCircle2 size={40} className="text-emerald-500" />
            </div>
            <h1 className="text-3xl font-black text-[#1A1A2E] mb-2">Payment Confirmed</h1>
            <p className="text-[#4A4A6A] mb-8 leading-relaxed">{message}</p>
          </>
        ) : status === "processing" ? (
          <>
            <div className="w-20 h-20 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-6 shadow-[0_4px_20px_rgba(245,158,11,0.2)]">
              <Loader2 size={40} className="text-amber-500 animate-spin" />
            </div>
            <h1 className="text-3xl font-black text-[#1A1A2E] mb-2">Processing...</h1>
            <p className="text-[#4A4A6A] mb-8 leading-relaxed">{message}</p>
          </>
        ) : (
          <>
            <div className="w-20 h-20 rounded-full bg-rose-50 flex items-center justify-center mx-auto mb-6 shadow-[0_4px_20px_rgba(244,63,94,0.2)]">
              <XCircle size={40} className="text-rose-500" />
            </div>
            <h1 className="text-3xl font-black text-[#1A1A2E] mb-2">Payment Failed</h1>
            <p className="text-[#4A4A6A] mb-8 leading-relaxed">{message}</p>
          </>
        )}

        <div className="space-y-3 pt-4 border-t border-[#F0EAD8]">
          <Link 
            href="/dashboard" 
            className="btn-primary w-full py-4 rounded-2xl flex items-center justify-center gap-2"
          >
            Go to Dashboard
            <ChevronRight size={18} />
          </Link>
          
          {status === "error" && (
            <button 
              onClick={() => window.history.back()}
              className="btn-outline w-full py-4 rounded-2xl flex items-center justify-center gap-2"
            >
              <ArrowLeft size={18} />
              Try Again
            </button>
          )}
        </div>
      </div>
      
      <div className="mt-8 text-center">
        <Link href="/" className="text-sm font-medium text-[#8A8AAA] hover:text-[#724A6A] transition-colors">
          Return to Homepage
        </Link>
      </div>
    </div>
  );
}

export default function PaymentStatusPage() {
  return (
    <div className="min-h-screen bg-[#FFFBE9] pt-24">
      <Suspense fallback={
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-12 h-12 text-[#724A6A] animate-spin" />
        </div>
      }>
        <Elements stripe={getStripe()}>
          <PaymentStatusContent />
        </Elements>
      </Suspense>
    </div>
  );
}
