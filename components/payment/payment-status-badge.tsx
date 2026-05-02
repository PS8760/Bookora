import React from "react";
import { cn } from "@/lib/utils";

export type PaymentStatus = "UNPAID" | "PENDING" | "PAID" | "REFUNDED" | "FAILED";

interface PaymentStatusBadgeProps {
  status: PaymentStatus;
  className?: string;
}

const statusConfig: Record<
  PaymentStatus,
  { label: string; className: string; dotClassName: string }
> = {
  UNPAID: {
    label: "Unpaid",
    className: "bg-gray-100 text-gray-700 border-gray-200",
    dotClassName: "bg-gray-400",
  },
  PENDING: {
    label: "Pending",
    className: "bg-amber-50 text-amber-700 border-amber-200",
    dotClassName: "bg-amber-400 animate-pulse",
  },
  PAID: {
    label: "Paid",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dotClassName: "bg-emerald-500",
  },
  REFUNDED: {
    label: "Refunded",
    className: "bg-blue-50 text-blue-700 border-blue-200",
    dotClassName: "bg-blue-500",
  },
  FAILED: {
    label: "Failed",
    className: "bg-rose-50 text-rose-700 border-rose-200",
    dotClassName: "bg-rose-500",
  },
};

export const PaymentStatusBadge: React.FC<PaymentStatusBadgeProps> = ({
  status,
  className,
}) => {
  const config = statusConfig[status] || statusConfig.UNPAID;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors",
        config.className,
        className
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full", config.dotClassName)} />
      {config.label}
    </div>
  );
};

export default PaymentStatusBadge;
