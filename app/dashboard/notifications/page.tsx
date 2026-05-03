"use client";

import { useState, useCallback } from "react";
import useSWR from "swr";
import Link from "next/link";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useSession } from "@/lib/auth-client";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface InAppNotification {
  id: string;
  type: "success" | "info" | "warning" | "error";
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  metadata?: Record<string, any>;
}

type TabType = "all" | "unread" | "booking" | "service" | "account";

const TAB_LABELS: { key: TabType; label: string; emoji: string }[] = [
  { key: "all",     label: "All",     emoji: "📬" },
  { key: "unread",  label: "Unread",  emoji: "🔴" },
  { key: "booking", label: "Booking", emoji: "📅" },
  { key: "service", label: "Service", emoji: "🚀" },
  { key: "account", label: "Account", emoji: "👤" },
];

function getTypeConfig(type: string) {
  switch (type) {
    case "success":
      return { bg: "#E8F5E9", text: "#2E7D32", icon: "✓", border: "#A5D6A7" };
    case "error":
      return { bg: "#FFEBEE", text: "#C62828", icon: "✗", border: "#EF9A9A" };
    case "warning":
      return { bg: "#FFF3E0", text: "#E65100", icon: "⚠", border: "#FFCC80" };
    default:
      return { bg: "#E1F5FE", text: "#0277BD", icon: "ℹ", border: "#81D4FA" };
  }
}

function getCategoryFromTitle(title: string): TabType {
  const t = title.toLowerCase();
  if (t.includes("booking") || t.includes("appointment") || t.includes("reminder") || t.includes("confirm") || t.includes("cancel") || t.includes("reschedul") || t.includes("request")) return "booking";
  if (t.includes("service") || t.includes("publish") || t.includes("payment") || t.includes("refund")) return "service";
  if (t.includes("role") || t.includes("account") || t.includes("welcome") || t.includes("summary") || t.includes("daily")) return "account";
  return "all";
}

function formatTimestamp(timestamp: Date) {
  const now = new Date();
  const diff = now.getTime() - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: days > 365 ? "numeric" : undefined,
  });
}

function NotificationSkeleton() {
  return (
    <div className="p-5 flex gap-4 animate-pulse">
      <div className="w-11 h-11 rounded-xl bg-[#E8E0D0] flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-[#E8E0D0] rounded w-3/5" />
        <div className="h-3 bg-[#E8E0D0] rounded w-4/5" />
        <div className="h-3 bg-[#E8E0D0] rounded w-2/5" />
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [markingAll, setMarkingAll] = useState(false);

  const { data, error, mutate, isLoading } = useSWR(
    session?.user ? "/api/notifications?limit=100" : null,
    fetcher,
    { refreshInterval: 5000, revalidateOnFocus: true }
  );

  const notifications: InAppNotification[] = data?.data ?? [];
  const unreadCount: number = data?.unreadCount ?? 0;

  // Filter notifications by tab
  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === "all") return true;
    if (activeTab === "unread") return !n.read;
    return getCategoryFromTitle(n.title) === activeTab;
  });

  const handleMarkAsRead = useCallback(async (notificationId: string) => {
    await fetch("/api/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notificationIds: [notificationId] }),
    });
    mutate();
  }, [mutate]);

  const handleMarkAllAsRead = async () => {
    setMarkingAll(true);
    await fetch("/api/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    await mutate();
    setMarkingAll(false);
  };

  // Tab counts
  const tabCounts: Record<TabType, number> = {
    all: notifications.length,
    unread: notifications.filter((n) => !n.read).length,
    booking: notifications.filter((n) => getCategoryFromTitle(n.title) === "booking").length,
    service: notifications.filter((n) => getCategoryFromTitle(n.title) === "service").length,
    account: notifications.filter((n) => getCategoryFromTitle(n.title) === "account").length,
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6 max-w-3xl mx-auto">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#1A1A2E] flex items-center gap-2">
              🔔 Notification Center
              {unreadCount > 0 && (
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#724A6A] text-white text-xs font-bold animate-pulse">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </h1>
            <p className="text-sm text-[#4A4A6A] mt-1">
              Real-time updates about your bookings, services, and account.
            </p>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              disabled={markingAll}
              className="px-4 py-2 text-sm font-semibold text-[#724A6A] border border-[#724A6A]/30 rounded-xl hover:bg-[#F5EDF4] transition-colors disabled:opacity-50"
            >
              {markingAll ? "Marking…" : "Mark all read"}
            </button>
          )}
        </div>

        {/* ── Tabs ────────────────────────────────────────────────────────── */}
        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide bg-white rounded-2xl border border-[#E8E0D0] p-1.5 shadow-[0_2px_8px_rgba(114,74,106,0.06)]">
          {TAB_LABELS.map(({ key, label, emoji }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-200 ${
                activeTab === key
                  ? "bg-[#724A6A] text-white shadow-[0_2px_8px_rgba(114,74,106,0.3)]"
                  : "text-[#4A4A6A] hover:bg-[#F5EDF4] hover:text-[#724A6A]"
              }`}
            >
              <span>{emoji}</span>
              {label}
              {tabCounts[key] > 0 && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    activeTab === key
                      ? "bg-white/20 text-white"
                      : "bg-[#724A6A]/10 text-[#724A6A]"
                  }`}
                >
                  {tabCounts[key]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Notification List ─────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-[#E8E0D0] shadow-[0_2px_12px_rgba(114,74,106,0.06)] overflow-hidden">

          {isLoading ? (
            <div className="divide-y divide-[#F0EAD8]">
              {Array.from({ length: 5 }).map((_, i) => (
                <NotificationSkeleton key={i} />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-16">
              <span className="text-5xl block mb-3">⚠️</span>
              <p className="font-semibold text-[#C62828] mb-1">Failed to load notifications</p>
              <button
                onClick={() => mutate()}
                className="text-sm text-[#724A6A] hover:underline"
              >
                Try again
              </button>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-20 h-20 rounded-2xl bg-[#F5EDF4] flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">
                  {activeTab === "unread" ? "✅" : "🔔"}
                </span>
              </div>
              <p className="font-semibold text-[#1A1A2E] mb-1.5">
                {activeTab === "unread"
                  ? "You're all caught up!"
                  : `No ${activeTab === "all" ? "" : activeTab + " "}notifications yet`}
              </p>
              <p className="text-sm text-[#8A8AAA]">
                {activeTab === "unread"
                  ? "No unread notifications — great job staying on top!"
                  : "Notifications will appear here as activity happens."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#F0EAD8]">
              {filteredNotifications.map((notif) => {
                const config = getTypeConfig(notif.type);
                const category = getCategoryFromTitle(notif.title);

                const categoryEmoji =
                  category === "booking" ? "📅"
                  : category === "service" ? "🚀"
                  : category === "account" ? "👤"
                  : "📬";

                return (
                  <div
                    key={notif.id}
                    className={`group flex gap-4 p-5 transition-all duration-200 cursor-pointer hover:bg-[#FFFBE9] ${
                      !notif.read ? "bg-[#FFF8F0]/50 border-l-4 border-l-[#724A6A]" : ""
                    }`}
                    onClick={() => {
                      if (!notif.read) handleMarkAsRead(notif.id);
                      if (notif.actionUrl) window.location.href = notif.actionUrl;
                    }}
                  >
                    {/* Icon */}
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold border"
                      style={{
                        background: config.bg,
                        color: config.text,
                        borderColor: config.border,
                      }}
                    >
                      {config.icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-sm text-[#1A1A2E] leading-snug">
                            {notif.title}
                          </p>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#F5EDF4] text-[#724A6A] font-medium">
                            {categoryEmoji} {category}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {!notif.read && (
                            <span className="w-2 h-2 rounded-full bg-[#724A6A] animate-pulse" />
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-[#4A4A6A] leading-relaxed mb-2 whitespace-pre-line">
                        {notif.message}
                      </p>
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] text-[#8A8AAA]">
                          {formatTimestamp(notif.timestamp)}
                        </p>
                        {notif.actionUrl && (
                          <span className="text-[11px] text-[#724A6A] font-semibold group-hover:underline">
                            View →
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Mark read button */}
                    {!notif.read && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkAsRead(notif.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 w-8 h-8 rounded-lg hover:bg-[#F5EDF4] flex items-center justify-center text-[#724A6A]"
                        title="Mark as read"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer */}
          {filteredNotifications.length > 0 && (
            <div className="px-5 py-3.5 bg-[#FFFBE9]/60 border-t border-[#E8E0D0] flex items-center justify-between">
              <p className="text-xs text-[#8A8AAA]">
                Showing {filteredNotifications.length} notification{filteredNotifications.length !== 1 ? "s" : ""}
                {activeTab !== "all" ? ` · ${activeTab}` : ""}
              </p>
              {activeTab === "unread" && unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  disabled={markingAll}
                  className="text-xs font-semibold text-[#724A6A] hover:underline disabled:opacity-50"
                >
                  {markingAll ? "Marking…" : "Mark all as read"}
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Help Text ────────────────────────────────────────────────── */}
        <div className="bg-[#F5EDF4]/40 rounded-2xl border border-[#E8E0D0] p-5">
          <h3 className="font-semibold text-sm text-[#1A1A2E] mb-2">About notifications</h3>
          <ul className="text-xs text-[#4A4A6A] space-y-1.5 list-none">
            <li className="flex items-start gap-2">
              <span className="text-[#724A6A] font-bold mt-0.5">📅</span>
              <span><strong>Booking</strong> — confirmations, cancellations, reminders, and reschedules.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#724A6A] font-bold mt-0.5">🚀</span>
              <span><strong>Service</strong> — service published, payment received, refunds.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#724A6A] font-bold mt-0.5">👤</span>
              <span><strong>Account</strong> — role changes, daily summaries, and account updates.</span>
            </li>
          </ul>
        </div>

      </div>
    </DashboardLayout>
  );
}
