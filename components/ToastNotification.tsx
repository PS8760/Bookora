"use client";

import { useEffect, useState } from "react";
import { playNotificationSound, playSuccessSound, playErrorSound } from "@/lib/notification-sound";

export interface Toast {
  id: string;
  type: "success" | "error" | "warning" | "info" | "message" | "booking" | "update";
  title: string;
  message: string;
  duration?: number;
  actionLabel?: string;
  actionUrl?: string;
}

interface ToastNotificationProps {
  toast: Toast;
  onClose: (id: string) => void;
}

function ToastNotification({ toast, onClose }: ToastNotificationProps) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const duration = toast.duration ?? 5000;
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onClose(toast.id), 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onClose]);

  const getIcon = () => {
    switch (toast.type) {
      case "success":
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        );
      case "error":
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        );
      case "warning":
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        );
      case "message":
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        );
      case "booking":
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        );
      case "update":
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
        );
      default:
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        );
    }
  };

  const getColors = () => {
    switch (toast.type) {
      case "success":
        return { bg: "#E8F5E9", border: "#2E7D32", text: "#1B5E20", icon: "#2E7D32" };
      case "error":
        return { bg: "#FFEBEE", border: "#C62828", text: "#B71C1C", icon: "#C62828" };
      case "warning":
        return { bg: "#FFF3E0", border: "#E65100", text: "#E65100", icon: "#E65100" };
      case "message":
        return { bg: "#F5EDF4", border: "#724A6A", text: "#5A3854", icon: "#724A6A" };
      case "booking":
        return { bg: "#E1F5FE", border: "#0277BD", text: "#01579B", icon: "#0277BD" };
      case "update":
        return { bg: "#FFF8E1", border: "#D4A017", text: "#B8860B", icon: "#D4A017" };
      default:
        return { bg: "#E1F5FE", border: "#0277BD", text: "#01579B", icon: "#0277BD" };
    }
  };

  const colors = getColors();

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-2xl shadow-[0_8px_32px_rgba(114,74,106,0.2)] border-2 min-w-[320px] max-w-md backdrop-blur-sm transition-all duration-300 ${
        isExiting ? "opacity-0 translate-x-full" : "opacity-100 translate-x-0"
      }`}
      style={{
        backgroundColor: colors.bg,
        borderColor: colors.border,
      }}
    >
      {/* Icon */}
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${colors.icon}20`, color: colors.icon }}
      >
        {getIcon()}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-sm leading-tight mb-1" style={{ color: colors.text }}>
          {toast.title}
        </h4>
        <p className="text-xs leading-relaxed" style={{ color: colors.text, opacity: 0.8 }}>
          {toast.message}
        </p>
        {toast.actionLabel && toast.actionUrl && (
          <a
            href={toast.actionUrl}
            className="inline-block mt-2 text-xs font-semibold hover:underline"
            style={{ color: colors.icon }}
          >
            {toast.actionLabel} →
          </a>
        )}
      </div>

      {/* Close Button */}
      <button
        onClick={() => {
          setIsExiting(true);
          setTimeout(() => onClose(toast.id), 300);
        }}
        className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-black/10 transition-colors flex-shrink-0"
        style={{ color: colors.text }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}

// Toast Container Component
export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    // Listen for custom toast events
    const handleToast = (event: CustomEvent<Toast>) => {
      const newToast = event.detail;
      setToasts((prev) => [...prev, newToast]);

      // Play sound based on type using event sound system
      import("@/lib/event-sounds").then(({ playNotificationTypeSound }) => {
        playNotificationTypeSound(newToast.type);
      });
    };

    window.addEventListener("show-toast" as any, handleToast);
    return () => window.removeEventListener("show-toast" as any, handleToast);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="fixed top-20 right-4 z-[100] flex flex-col gap-3 pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastNotification toast={toast} onClose={removeToast} />
        </div>
      ))}
    </div>
  );
}

// Helper function to show toast
export function showToast(toast: Omit<Toast, "id">) {
  const event = new CustomEvent("show-toast", {
    detail: {
      ...toast,
      id: `toast-${Date.now()}-${Math.random()}`,
    },
  });
  window.dispatchEvent(event);
}
