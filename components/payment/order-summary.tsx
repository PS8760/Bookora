import React from "react";
import { Calendar, Clock, User, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface OrderSummaryProps {
  serviceName: string;
  amount: number;
  currency: string;
  bookingDate: string;
  providerName: string;
  durationMinutes: number;
  className?: string;
}

export const OrderSummary: React.FC<OrderSummaryProps> = ({
  serviceName,
  amount,
  currency,
  bookingDate,
  providerName,
  durationMinutes,
  className,
}) => {
  const formatter = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency === "INR" ? "INR" : currency,
    currencyDisplay: "symbol",
  });

  const subtotal = amount;
  const platformFee = 0; // We can add this later if needed
  const total = subtotal + platformFee;

  return (
    <div className={cn("bg-white rounded-3xl border border-[#E8E0D0] overflow-hidden shadow-[0_8px_30px_rgba(114,74,106,0.08)]", className)}>
      <div className="p-6 bg-[#FDFBF7] border-b border-[#E8E0D0]">
        <h3 className="text-lg font-bold text-[#1A1A2E] flex items-center gap-2">
          <ShieldCheck className="text-[#724A6A] w-5 h-5" />
          Order Summary
        </h3>
        <p className="text-xs text-[#8A8AAA] mt-1 font-medium uppercase tracking-wider">Review your secure booking</p>
      </div>
      
      <div className="p-6 space-y-6">
        {/* Service Info */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#F5EDF4] flex items-center justify-center flex-shrink-0">
            <span className="text-xl">✨</span>
          </div>
          <div>
            <h4 className="font-bold text-[#1A1A2E] leading-tight">{serviceName}</h4>
            <p className="text-sm text-[#4A4A6A] flex items-center gap-1.5 mt-1">
              <User size={14} className="text-[#8A8AAA]" />
              {providerName}
            </p>
          </div>
        </div>

        {/* Date/Time Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-2xl bg-[#FFFBE9] border border-[#F0EAD8]">
            <div className="flex items-center gap-1.5 text-[#8A8AAA] text-[10px] uppercase font-bold mb-1">
              <Calendar size={12} />
              Date
            </div>
            <p className="text-sm font-bold text-[#1A1A2E]">{bookingDate}</p>
          </div>
          <div className="p-3 rounded-2xl bg-[#FFFBE9] border border-[#F0EAD8]">
            <div className="flex items-center gap-1.5 text-[#8A8AAA] text-[10px] uppercase font-bold mb-1">
              <Clock size={12} />
              Duration
            </div>
            <p className="text-sm font-bold text-[#1A1A2E]">{durationMinutes} Min</p>
          </div>
        </div>

        {/* Price Breakdown */}
        <div className="pt-4 border-t border-dashed border-[#E8E0D0] space-y-3">
          <div className="flex justify-between items-center text-sm">
            <span className="text-[#4A4A6A]">Service Fee</span>
            <span className="font-semibold text-[#1A1A2E]">{formatter.format(subtotal)}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-[#4A4A6A]">Processing Fee</span>
            <span className="text-[#2E7D32] font-semibold">FREE</span>
          </div>
          
          <div className="pt-3 flex justify-between items-end">
            <div>
              <span className="text-xs font-bold text-[#8A8AAA] uppercase tracking-widest">Total Amount</span>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-[#724A6A]">
                {formatter.format(total)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 py-4 bg-[#F5EDF4]/30 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-[#2E7D32] animate-pulse" />
        <span className="text-[10px] font-bold text-[#4A4A6A] uppercase tracking-wide">Secure Checkout Powered by Stripe</span>
      </div>
    </div>
  );
};

export default OrderSummary;
