"use client";

import React, { useState } from "react";
import {
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { Lock, ShieldCheck, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface CheckoutFormProps {
  bookingId: string;
  amount: number;
  currency: string;
}

export const CheckoutForm: React.FC<CheckoutFormProps> = ({
  bookingId,
  amount,
  currency,
}) => {
  const stripe = useStripe();
  const elements = useElements();

  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);
    setMessage(null);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/book/status?bookingId=${bookingId}`,
      },
    });

    // This point will only be reached if there is an immediate error when
    // confirming the payment. Otherwise, your customer will be redirected to
    // your `return_url`. For some payment methods like iDEAL, your customer will
    // be redirected to an intermediate site first to authorize the payment, then
    // redirected to the `return_url`.
    if (error.type === "card_error" || error.type === "validation_error") {
      setMessage(error.message || "An error occurred during payment.");
    } else {
      setMessage("An unexpected error occurred. Please try again.");
    }

    setIsLoading(false);
  };

  return (
    <div className="bg-white rounded-3xl border border-[#E8E0D0] p-6 shadow-[0_8px_30px_rgba(114,74,106,0.08)]">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-[#1A1A2E] flex items-center gap-2">
          <Lock className="text-[#724A6A] w-4 h-4" />
          Payment Information
        </h3>
        <p className="text-sm text-[#8A8AAA] mt-1">Select your preferred payment method below.</p>
      </div>

      <form id="payment-form" onSubmit={handleSubmit} className="space-y-6">
        <div className="payment-element-container p-2 rounded-2xl border border-[#F0EAD8] bg-[#FDFBF7]">
          <PaymentElement 
            id="payment-element" 
            options={{ 
              layout: "tabs",
              terms: {
                card: 'never',
                upi: 'never'
              },
              business: {
                name: 'Bookora'
              }
            }} 
          />
        </div>
        
        {message && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-700 animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <p>{message}</p>
          </div>
        )}

        <button
          disabled={isLoading || !stripe || !elements}
          id="submit"
          className={cn(
            "w-full py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg",
            isLoading 
              ? "bg-[#F5EDF4] text-[#8A8AAA] cursor-not-allowed" 
              : "bg-[#724A6A] text-white hover:bg-[#5D3C56] active:scale-[0.98] hover:shadow-[#724A6A]/20"
          )}
        >
          {isLoading ? (
            <>
              <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Verifying...</span>
            </>
          ) : (
            <>
              <ShieldCheck className="w-5 h-5" />
              <span>Complete Payment</span>
            </>
          )}
        </button>

        <div className="flex flex-col items-center gap-3 mt-6">
          <div className="flex items-center justify-center gap-4 grayscale opacity-50">
             {/* Payment Icons could go here */}
             <img src="https://upload.wikimedia.org/wikipedia/commons/e/e1/UPI-Logo.png" alt="UPI" className="h-4 object-contain" />
             <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" alt="Visa" className="h-3 object-contain" />
             <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-6 object-contain" />
          </div>
          <p className="text-[10px] text-[#8A8AAA] font-medium text-center uppercase tracking-widest flex items-center gap-1.5">
            <Lock className="w-3 h-3" />
            Bank-level 256-bit SSL Encryption
          </p>
        </div>
      </form>
    </div>
  );
};

export default CheckoutForm;
