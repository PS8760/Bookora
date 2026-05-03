"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "@/lib/auth-client";
import useSWR from "swr";
import { playNotificationSound, initAudioContext } from "@/lib/notification-sound";

interface Notification {
  id: string;
  type: "success" | "info" | "warning" | "error";
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
}

type BellTab = "all" | "unread";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function NotificationBell() {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<BellTab>("all");
  const [previousUnreadCount, setPreviousUnreadCount] = useState<number | null>(null);
  const [audioInitialized, setAudioInitialized] = useState(false);
  const [newArrival, setNewArrival] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const hasPlayedInitialSound = useRef(false);

  const { data, mutate } = useSWR(
    session?.user ? "/api/notifications?limit=15" : null,
    fetcher,
    { refreshInterval: 5000 } // Poll every 5s for near-real-time
  );

  const notifications: Notification[] = data?.data ?? [];
  const unreadCount: number = data?.unreadCount ?? 0;

  const displayedNotifications =
    activeTab === "unread" ? notifications.filter((n) => !n.read) : notifications;

  // Initialize audio context on first user interaction
  useEffect(() => {
    const initAudio = () => {
      if (!audioInitialized) {
        initAudioContext();
        setAudioInitialized(true);
      }
    };
    document.addEventListener("click", initAudio, { once: true });
    document.addEventListener("keydown", initAudio, { once: true });
    document.addEventListener("touchstart", initAudio, { once: true });
    return () => {
      document.removeEventListener("click", initAudio);
      document.removeEventListener("keydown", initAudio);
      document.removeEventListener("touchstart", initAudio);
    };
  }, [audioInitialized]);

  // Play sound + animate when new notifications arrive
  useEffect(() => {
    if (!audioInitialized) return;

    if (previousUnreadCount === null) {
      setPreviousUnreadCount(unreadCount);
      hasPlayedInitialSound.current = true;
      return;
    }

    if (unreadCount > previousUnreadCount) {
      playNotificationSound();
      setNewArrival(true);
      setTimeout(() => setNewArrival(false), 2000);

      // Fire a toast for the latest unread notification
      const latestUnread = notifications.find((n) => !n.read);
      if (latestUnread && typeof window !== "undefined") {
        const toastType =
          latestUnread.type === "success" ? "booking"
          : latestUnread.type === "warning" ? "update"
          : latestUnread.type === "error" ? "error"
          : "info";

        window.dispatchEvent(
          new CustomEvent("show-toast", {
            detail: {
              id: `notif-toast-${Date.now()}`,
              type: toastType,
              title: latestUnread.title,
              message: latestUnread.message.slice(0, 100) + (latestUnread.message.length > 100 ? "…" : ""),
              duration: 6000,
              actionLabel: latestUnread.actionUrl ? "View" : undefined,
              actionUrl: latestUnread.actionUrl,
            },
          })
        );
      }
    }

    setPreviousUnreadCount(unreadCount);
  }, [unreadCount, previousUnreadCount, audioInitialized, notifications]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const handleMarkAsRead = async (notificationId?: string) => {
    await fetch("/api/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notificationIds: notificationId ? [notificationId] : undefined }),
    });
    mutate();
  };

  const handleMarkAllAsRead = async () => {
    await handleMarkAsRead();
    setIsOpen(false);
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case "success": return "✓";
      case "error":   return "✗";
      case "warning": return "⚠";
      default:        return "ℹ";
    }
  };

  const getColorForType = (type: string) => {
    switch (type) {
      case "success": return { bg: "#E8F5E9", text: "#2E7D32" };
      case "error":   return { bg: "#FFEBEE", text: "#C62828" };
      case "warning": return { bg: "#FFF3E0", text: "#E65100" };
      default:        return { bg: "#E1F5FE", text: "#0277BD" };
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1)  return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24)   return `${hours}h ago`;
    if (days < 7)     return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString("en-IN", { month: "short", day: "numeric" });
  };

  if (!session?.user) return null;

  return (
    <div className="relative" ref={dropdownRef}>

      {/* ── Bell Button ──────────────────────────────────────────────── */}
      <button
        id="notification-bell-btn"
        onClick={() => setIsOpen(!isOpen)}
        className={`relative w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-300 ${
          isOpen ? "bg-[#724A6A]/15 text-[#724A6A]" : "hover:bg-white/10"
        } ${newArrival ? "animate-bounce" : ""}`}
        aria-label="Notifications"
      >
        <svg
          width="20" height="20" viewBox="0 0 24 24"
          fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className={newArrival ? "text-[#724A6A]" : ""}
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>

        {unreadCount > 0 && (
          <span
            className={`absolute -top-1 -right-1 w-5 h-5 bg-[#724A6A] text-white text-[10px] font-bold rounded-full flex items-center justify-center transition-transform ${
              newArrival ? "scale-125" : "scale-100"
            }`}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* ── Dropdown ─────────────────────────────────────────────────── */}
      {isOpen && (
        <div
          id="notification-dropdown"
          className="absolute right-0 top-12 w-[400px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-[0_8px_40px_rgba(114,74,106,0.22)] border border-[#E8E0D0] overflow-hidden z-50"
          style={{ animation: "slideDown 0.18s ease-out" }}
        >

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8E0D0]">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-[#1A1A2E]">Notifications</h3>
              {unreadCount > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#724A6A] text-white">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs text-[#724A6A] hover:underline font-medium"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* All / Unread Tabs */}
          <div className="flex border-b border-[#E8E0D0] bg-[#FFFBE9]/40">
            {(["all", "unread"] as BellTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2.5 text-xs font-semibold capitalize transition-colors ${
                  activeTab === tab
                    ? "text-[#724A6A] border-b-2 border-[#724A6A]"
                    : "text-[#8A8AAA] hover:text-[#4A4A6A]"
                }`}
              >
                {tab === "all" ? `All (${notifications.length})` : `Unread (${unreadCount})`}
              </button>
            ))}
          </div>

          {/* Notification List */}
          <div className="max-h-[380px] overflow-y-auto">
            {displayedNotifications.length === 0 ? (
              <div className="text-center py-12">
                <span className="text-4xl mb-3 block">
                  {activeTab === "unread" ? "✅" : "🔔"}
                </span>
                <p className="text-sm font-medium text-[#1A1A2E] mb-1">
                  {activeTab === "unread" ? "All caught up!" : "No notifications yet"}
                </p>
                <p className="text-xs text-[#8A8AAA]">
                  {activeTab === "unread"
                    ? "No unread notifications."
                    : "Activity will appear here."}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#F0EAD8]">
                {displayedNotifications.map((notif) => {
                  const colors = getColorForType(notif.type);
                  return (
                    <div
                      key={notif.id}
                      className={`group p-4 hover:bg-[#FFFBE9] transition-colors cursor-pointer ${
                        !notif.read ? "bg-[#FFF8F0]/60 border-l-2 border-l-[#724A6A]" : ""
                      }`}
                      onClick={() => {
                        if (!notif.read) handleMarkAsRead(notif.id);
                        if (notif.actionUrl) window.location.href = notif.actionUrl;
                      }}
                    >
                      <div className="flex gap-3">
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-bold"
                          style={{ background: colors.bg, color: colors.text }}
                        >
                          {getIconForType(notif.type)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-0.5">
                            <p className="font-semibold text-xs text-[#1A1A2E] leading-tight">
                              {notif.title}
                            </p>
                            {!notif.read && (
                              <span className="w-1.5 h-1.5 rounded-full bg-[#724A6A] flex-shrink-0 mt-1 animate-pulse" />
                            )}
                          </div>
                          <p className="text-[11px] text-[#4A4A6A] leading-relaxed mb-1 line-clamp-2">
                            {notif.message}
                          </p>
                          <p className="text-[10px] text-[#8A8AAA]">
                            {formatTimestamp(notif.timestamp)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-[#E8E0D0] bg-[#FFFBE9]/40 flex items-center justify-between">
            <a
              href="/dashboard/notifications"
              className="text-xs text-[#724A6A] hover:underline font-semibold"
            >
              View all notifications →
            </a>
            <span className="text-[10px] text-[#8A8AAA]">Auto-refreshes every 5s</span>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }
      `}</style>
    </div>
  );
}
