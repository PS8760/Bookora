"use client";

import { useState } from "react";
import { showToast } from "@/components/ToastNotification";
import { playNotificationSound, playSuccessSound, playErrorSound, initAudioContext } from "@/lib/notification-sound";

export default function TestNotificationsPage() {
  const [audioInitialized, setAudioInitialized] = useState(false);

  const initAudio = () => {
    initAudioContext();
    setAudioInitialized(true);
    showToast({
      type: "success",
      title: "Audio Initialized",
      message: "Sound effects are now enabled!",
      duration: 3000,
    });
  };

  const testToasts = [
    {
      type: "success" as const,
      title: "Booking Confirmed! 🎉",
      message: "Your appointment for Haircut on Dec 25 at 2:00 PM has been confirmed.",
      actionLabel: "View Booking",
      actionUrl: "#",
    },
    {
      type: "error" as const,
      title: "Booking Failed",
      message: "Unable to process your booking. Please try again later.",
    },
    {
      type: "warning" as const,
      title: "Limited Availability",
      message: "Only 2 slots remaining for this date. Book now!",
    },
    {
      type: "info" as const,
      title: "New Feature Available",
      message: "You can now reschedule appointments directly from your dashboard.",
      actionLabel: "Learn More",
      actionUrl: "#",
    },
    {
      type: "message" as const,
      title: "New Message from John",
      message: "Hi, I'd like to reschedule my appointment to next week...",
      actionLabel: "Reply",
      actionUrl: "#",
    },
    {
      type: "booking" as const,
      title: "Booking Request Received",
      message: "We've received your booking request. We'll confirm it shortly.",
    },
    {
      type: "update" as const,
      title: "Service Updated",
      message: "Your service 'Premium Haircut' has been successfully updated.",
      actionLabel: "View Service",
      actionUrl: "#",
    },
  ];

  const testSounds = [
    { name: "Notification Sound", fn: playNotificationSound },
    { name: "Success Sound", fn: playSuccessSound },
    { name: "Error Sound", fn: playErrorSound },
  ];

  const createTestNotification = async () => {
    try {
      const response = await fetch("/api/notifications/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "info",
          title: "Test Notification",
          message: "This is a test notification in your notification bell!",
        }),
      });

      if (response.ok) {
        showToast({
          type: "success",
          title: "Test Notification Created",
          message: "Check your notification bell (top right)!",
        });
      } else {
        showToast({
          type: "error",
          title: "Failed to Create Notification",
          message: "Make sure you're logged in.",
        });
      }
    } catch (error) {
      showToast({
        type: "error",
        title: "Error",
        message: "Failed to create test notification.",
      });
    }
  };

  const sendMessageToAdmin = async () => {
    try {
      const response = await fetch("/api/admin/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: "Test",
          subject: "Test Message from Notification System",
          message: "This is a test message to verify that admin notifications are working correctly. Admins should receive this notification immediately!",
        }),
      });

      if (response.ok) {
        const data = await response.json();
        showToast({
          type: "success",
          title: "Message Sent to Admin! 📨",
          message: `Notification sent to ${data.adminCount} admin(s). They should see it in their bell!`,
          duration: 7000,
        });
      } else {
        const error = await response.json();
        showToast({
          type: "error",
          title: "Failed to Send Message",
          message: error.error?.message || "Make sure you're logged in.",
        });
      }
    } catch (error) {
      showToast({
        type: "error",
        title: "Error",
        message: "Failed to send message to admin.",
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFBE9] pt-24 pb-16">
      <div className="page-container max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-[#1A1A2E] mb-3">
            Notification System <span className="gradient-brand-text">Test Page</span>
          </h1>
          <p className="text-[#4A4A6A]">
            Test all notification features including toast notifications, sounds, and bell notifications
          </p>
        </div>

        {/* Audio Initialization */}
        {!audioInitialized && (
          <div className="bg-[#FFF3E0] border-2 border-[#E65100] rounded-2xl p-6 mb-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#E65100]/20 flex items-center justify-center flex-shrink-0">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#E65100" strokeWidth="2">
                  <path d="M11 5L6 9H2v6h4l5 4V5z" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-[#E65100] mb-2">Audio Not Initialized</h3>
                <p className="text-sm text-[#E65100]/80 mb-4">
                  Click the button below to enable sound effects. This is required due to browser autoplay policies.
                </p>
                <button onClick={initAudio} className="btn-primary text-sm py-2 px-6">
                  🔊 Enable Sound Effects
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Toast Notifications Section */}
        <div className="bg-white rounded-2xl border border-[#E8E0D0] shadow-[0_2px_12px_rgba(114,74,106,0.06)] p-6 mb-8">
          <h2 className="text-xl font-bold text-[#1A1A2E] mb-4 flex items-center gap-2">
            <span className="text-2xl">🍞</span>
            Toast Notifications
          </h2>
          <p className="text-sm text-[#4A4A6A] mb-6">
            Click any button below to show a floating toast notification with sound
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {testToasts.map((toast, index) => (
              <button
                key={index}
                onClick={() => showToast(toast)}
                className="p-4 rounded-xl border-2 border-[#E8E0D0] hover:border-[#724A6A] hover:bg-[#F5EDF4] transition-all text-left group"
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">
                    {toast.type === "success" && "✅"}
                    {toast.type === "error" && "❌"}
                    {toast.type === "warning" && "⚠️"}
                    {toast.type === "info" && "ℹ️"}
                    {toast.type === "message" && "💬"}
                    {toast.type === "booking" && "📅"}
                    {toast.type === "update" && "🔄"}
                  </span>
                  <span className="font-semibold text-[#1A1A2E] capitalize">{toast.type}</span>
                </div>
                <p className="text-xs text-[#4A4A6A] line-clamp-2">{toast.title}</p>
              </button>
            ))}
          </div>

          <div className="mt-6 p-4 bg-[#FFFBE9] rounded-xl border border-[#E8E0D0]">
            <p className="text-xs text-[#4A4A6A] mb-2">
              <strong>Tip:</strong> Click multiple buttons quickly to see toast stacking!
            </p>
          </div>
        </div>

        {/* Sound Effects Section */}
        <div className="bg-white rounded-2xl border border-[#E8E0D0] shadow-[0_2px_12px_rgba(114,74,106,0.06)] p-6 mb-8">
          <h2 className="text-xl font-bold text-[#1A1A2E] mb-4 flex items-center gap-2">
            <span className="text-2xl">🔊</span>
            Sound Effects
          </h2>
          <p className="text-sm text-[#4A4A6A] mb-6">
            Test different notification sounds (iOS-style tri-tone)
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {testSounds.map((sound, index) => (
              <button
                key={index}
                onClick={() => {
                  if (!audioInitialized) {
                    initAudio();
                  }
                  sound.fn();
                }}
                className="p-4 rounded-xl border-2 border-[#E8E0D0] hover:border-[#724A6A] hover:bg-[#F5EDF4] transition-all text-center group"
              >
                <div className="text-3xl mb-2">
                  {index === 0 && "🔔"}
                  {index === 1 && "✅"}
                  {index === 2 && "❌"}
                </div>
                <p className="font-semibold text-sm text-[#1A1A2E]">{sound.name}</p>
              </button>
            ))}
          </div>

          <div className="mt-6 p-4 bg-[#E1F5FE] rounded-xl border border-[#0277BD]">
            <p className="text-xs text-[#01579B]">
              <strong>Note:</strong> Sounds are generated using Web Audio API (no external files needed!)
            </p>
          </div>
        </div>

        {/* Bell Notification Section */}
        <div className="bg-white rounded-2xl border border-[#E8E0D0] shadow-[0_2px_12px_rgba(114,74,106,0.06)] p-6 mb-8">
          <h2 className="text-xl font-bold text-[#1A1A2E] mb-4 flex items-center gap-2">
            <span className="text-2xl">🔔</span>
            Bell Notifications
          </h2>
          <p className="text-sm text-[#4A4A6A] mb-6">
            Test the notification bell in the navbar (top right corner)
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={createTestNotification}
              className="btn-primary flex-1 py-3 px-6"
            >
              Create Test Notification
            </button>
            <button
              onClick={sendMessageToAdmin}
              className="btn-outline flex-1 py-3 px-6 border-2"
            >
              📨 Send Message to Admin
            </button>
          </div>

          <div className="mt-6 p-4 bg-[#FFF8E1] rounded-xl border border-[#D4A017]">
            <p className="text-xs text-[#B8860B] mb-2">
              <strong>How it works:</strong>
            </p>
            <ul className="text-xs text-[#B8860B] space-y-1 ml-4 list-disc">
              <li>Click "Create Test Notification" to add a notification to your bell</li>
              <li>Click "Send Message to Admin" to send a message that admins will see</li>
              <li>Look at the bell icon in the top-right corner of the navbar</li>
              <li>You should see a red badge with the unread count</li>
              <li>Click the bell to see your notifications</li>
              <li>The notification bell polls every 10 seconds for new notifications</li>
            </ul>
          </div>

          <div className="mt-4 p-4 bg-[#E8F5E9] rounded-xl border border-[#2E7D32]">
            <p className="text-xs text-[#1B5E20]">
              <strong>✅ Real-world test:</strong> The "Send Message to Admin" button simulates a user contacting support. 
              If you're logged in as an admin, you'll receive the notification immediately!
            </p>
          </div>
        </div>

        {/* Real-World Scenarios */}
        <div className="bg-white rounded-2xl border border-[#E8E0D0] shadow-[0_2px_12px_rgba(114,74,106,0.06)] p-6">
          <h2 className="text-xl font-bold text-[#1A1A2E] mb-4 flex items-center gap-2">
            <span className="text-2xl">🎬</span>
            Real-World Scenarios
          </h2>
          <p className="text-sm text-[#4A4A6A] mb-6">
            Simulate real booking system scenarios
          </p>

          <div className="space-y-3">
            <button
              onClick={() => {
                showToast({
                  type: "booking",
                  title: "Booking Request Sent",
                  message: "Your booking request for 'Premium Haircut' has been sent to the organiser.",
                });
                setTimeout(() => {
                  showToast({
                    type: "success",
                    title: "Booking Confirmed! 🎉",
                    message: "Your appointment has been confirmed for Dec 25 at 2:00 PM.",
                    actionLabel: "View Details",
                    actionUrl: "#",
                  });
                }, 3000);
              }}
              className="w-full p-4 rounded-xl border-2 border-[#E8E0D0] hover:border-[#724A6A] hover:bg-[#F5EDF4] transition-all text-left"
            >
              <p className="font-semibold text-[#1A1A2E] mb-1">📅 Booking Flow</p>
              <p className="text-xs text-[#4A4A6A]">
                Simulates: Request sent → Confirmation (3 seconds later)
              </p>
            </button>

            <button
              onClick={() => {
                showToast({
                  type: "update",
                  title: "Service Created",
                  message: "Your service 'Premium Haircut' has been created successfully.",
                });
                setTimeout(() => {
                  showToast({
                    type: "info",
                    title: "Configure Schedule",
                    message: "Don't forget to set up your working hours!",
                    actionLabel: "Set Schedule",
                    actionUrl: "#",
                  });
                }, 2000);
              }}
              className="w-full p-4 rounded-xl border-2 border-[#E8E0D0] hover:border-[#724A6A] hover:bg-[#F5EDF4] transition-all text-left"
            >
              <p className="font-semibold text-[#1A1A2E] mb-1">🏢 Service Creation</p>
              <p className="text-xs text-[#4A4A6A]">
                Simulates: Service created → Reminder to configure
              </p>
            </button>

            <button
              onClick={() => {
                showToast({
                  type: "message",
                  title: "New Message",
                  message: "Customer: 'Can I reschedule to next week?'",
                  actionLabel: "Reply",
                  actionUrl: "#",
                });
              }}
              className="w-full p-4 rounded-xl border-2 border-[#E8E0D0] hover:border-[#724A6A] hover:bg-[#F5EDF4] transition-all text-left"
            >
              <p className="font-semibold text-[#1A1A2E] mb-1">💬 New Message</p>
              <p className="text-xs text-[#4A4A6A]">
                Simulates: Incoming message from customer
              </p>
            </button>

            <button
              onClick={() => {
                showToast({
                  type: "warning",
                  title: "Booking Cancelled",
                  message: "Customer has cancelled their appointment. Slot is now available.",
                });
              }}
              className="w-full p-4 rounded-xl border-2 border-[#E8E0D0] hover:border-[#724A6A] hover:bg-[#F5EDF4] transition-all text-left"
            >
              <p className="font-semibold text-[#1A1A2E] mb-1">⚠️ Cancellation</p>
              <p className="text-xs text-[#4A4A6A]">
                Simulates: Customer cancels booking
              </p>
            </button>
          </div>
        </div>

        {/* Back Button */}
        <div className="mt-8 text-center">
          <a href="/" className="btn-outline py-2 px-6">
            ← Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}
