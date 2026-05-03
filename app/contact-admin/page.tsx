"use client";

import { useState } from "react";
import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { showToast } from "@/components/ToastNotification";

export default function ContactAdminPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    category: "General",
    subject: "",
    message: "",
  });

  const categories = [
    "General",
    "Booking Issue",
    "Payment Issue",
    "Service Question",
    "Technical Support",
    "Feature Request",
    "Bug Report",
    "Other",
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!session?.user) {
      showToast({
        type: "error",
        title: "Authentication Required",
        message: "Please log in to contact admin.",
      });
      router.push("/login?callbackUrl=/contact-admin");
      return;
    }

    if (!formData.subject.trim() || !formData.message.trim()) {
      showToast({
        type: "warning",
        title: "Missing Information",
        message: "Please fill in all required fields.",
      });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/admin/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const data = await response.json();
        
        showToast({
          type: "success",
          title: "Message Sent! 📨",
          message: `Your message has been sent to ${data.adminCount} admin${data.adminCount > 1 ? "s" : ""}. They'll respond soon!`,
          duration: 7000,
        });

        // Reset form
        setFormData({
          category: "General",
          subject: "",
          message: "",
        });
      } else {
        const error = await response.json();
        showToast({
          type: "error",
          title: "Failed to Send",
          message: error.error?.message || "Please try again later.",
        });
      }
    } catch (error) {
      showToast({
        type: "error",
        title: "Connection Error",
        message: "Unable to send message. Please check your connection.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFBE9] pt-24 pb-16">
      <div className="page-container max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-[#F5EDF4] flex items-center justify-center mx-auto mb-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#724A6A" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-[#1A1A2E] mb-2">
            Contact <span className="gradient-brand-text">Admin</span>
          </h1>
          <p className="text-[#4A4A6A]">
            Send a message to the admin team. We'll get back to you as soon as possible.
          </p>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
          <div className="bg-white rounded-xl border border-[#E8E0D0] p-4 text-center">
            <div className="text-2xl mb-2">⚡</div>
            <p className="text-xs font-semibold text-[#1A1A2E]">Instant Notification</p>
            <p className="text-[10px] text-[#8A8AAA] mt-1">Admins notified immediately</p>
          </div>
          <div className="bg-white rounded-xl border border-[#E8E0D0] p-4 text-center">
            <div className="text-2xl mb-2">🔔</div>
            <p className="text-xs font-semibold text-[#1A1A2E]">Real-time Updates</p>
            <p className="text-[10px] text-[#8A8AAA] mt-1">Get notified of responses</p>
          </div>
          <div className="bg-white rounded-xl border border-[#E8E0D0] p-4 text-center">
            <div className="text-2xl mb-2">💬</div>
            <p className="text-xs font-semibold text-[#1A1A2E]">Direct Communication</p>
            <p className="text-[10px] text-[#8A8AAA] mt-1">Message history saved</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-[#E8E0D0] shadow-[0_2px_12px_rgba(114,74,106,0.06)] p-6">
          {/* Category */}
          <div className="mb-5">
            <label className="block text-sm font-semibold text-[#1A1A2E] mb-2">
              Category <span className="text-[#C62828]">*</span>
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="input-base"
              required
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Subject */}
          <div className="mb-5">
            <label className="block text-sm font-semibold text-[#1A1A2E] mb-2">
              Subject <span className="text-[#C62828]">*</span>
            </label>
            <input
              type="text"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              placeholder="Brief description of your issue or question"
              className="input-base"
              required
              maxLength={200}
            />
            <p className="text-xs text-[#8A8AAA] mt-1">
              {formData.subject.length}/200 characters
            </p>
          </div>

          {/* Message */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-[#1A1A2E] mb-2">
              Message <span className="text-[#C62828]">*</span>
            </label>
            <textarea
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="Provide detailed information about your inquiry..."
              className="input-base min-h-[150px] resize-y"
              required
              maxLength={2000}
            />
            <p className="text-xs text-[#8A8AAA] mt-1">
              {formData.message.length}/2000 characters
            </p>
          </div>

          {/* User Info Display */}
          {session?.user && (
            <div className="mb-6 p-4 bg-[#FFFBE9] rounded-xl border border-[#E8E0D0]">
              <p className="text-xs font-semibold text-[#8A8AAA] uppercase tracking-wide mb-2">
                Sending as:
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#F5EDF4] flex items-center justify-center text-sm font-bold text-[#724A6A]">
                  {session.user.name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-sm text-[#1A1A2E]">{session.user.name}</p>
                  <p className="text-xs text-[#8A8AAA]">{session.user.email}</p>
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="btn-outline flex-1 py-3"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary flex-1 py-3"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Sending...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                  Send Message
                </span>
              )}
            </button>
          </div>
        </form>

        {/* Help Text */}
        <div className="mt-6 p-4 bg-[#E1F5FE] rounded-xl border border-[#0277BD]">
          <p className="text-xs text-[#01579B] mb-2">
            <strong>💡 Tip:</strong> For urgent issues, please include:
          </p>
          <ul className="text-xs text-[#01579B] space-y-1 ml-4 list-disc">
            <li>Your booking ID (if applicable)</li>
            <li>Screenshots of any errors</li>
            <li>Steps to reproduce the issue</li>
            <li>Your preferred contact method</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
