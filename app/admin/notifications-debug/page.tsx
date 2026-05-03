"use client";

import { useState, useEffect } from "react";
import { useSession } from "@/lib/auth-client";

interface NotificationData {
  id: string;
  userId: string;
  channel: string;
  status: string;
  subject: string | null;
  body: string;
  createdAt: string;
  sentAt: string | null;
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
}

export default function NotificationsDebugPage() {
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch recent notifications
      const notifResponse = await fetch("/api/admin/notifications-debug");
      if (!notifResponse.ok) {
        throw new Error("Failed to fetch notifications");
      }
      const notifData = await notifResponse.json();
      setNotifications(notifData.notifications || []);
      setAdmins(notifData.admins || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const sendTestNotification = async () => {
    try {
      setTestResult("Sending...");
      const response = await fetch("/api/admin/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: "Debug Test",
          subject: "Debug Test Notification",
          message: `Test notification sent at ${new Date().toLocaleString()}`,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setTestResult(`✅ Success! Sent to ${data.adminCount} admin(s). Refresh in 2 seconds...`);
        setTimeout(() => {
          fetchData();
          setTestResult(null);
        }, 2000);
      } else {
        const error = await response.json();
        setTestResult(`❌ Error: ${error.error?.message || "Unknown error"}`);
      }
    } catch (err) {
      setTestResult(`❌ Error: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  };

  if (!session?.user) {
    return (
      <div className="min-h-screen bg-[#FFFBE9] pt-24 pb-16">
        <div className="page-container max-w-4xl text-center">
          <h1 className="text-2xl font-bold text-[#1A1A2E] mb-4">Authentication Required</h1>
          <p className="text-[#4A4A6A] mb-6">Please log in to access this debug page.</p>
          <a href="/login" className="btn-primary py-2 px-6">
            Log In
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFBE9] pt-24 pb-16">
      <div className="page-container max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#1A1A2E] mb-2">
            Notifications <span className="gradient-brand-text">Debug Panel</span>
          </h1>
          <p className="text-[#4A4A6A]">
            Diagnostic tool for troubleshooting the notification system
          </p>
        </div>

        {/* Current User Info */}
        <div className="bg-white rounded-2xl border border-[#E8E0D0] shadow-[0_2px_12px_rgba(114,74,106,0.06)] p-6 mb-6">
          <h2 className="text-lg font-bold text-[#1A1A2E] mb-4">Current User</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-[#8A8AAA] mb-1">Name</p>
              <p className="font-semibold text-[#1A1A2E]">{session.user.name}</p>
            </div>
            <div>
              <p className="text-xs text-[#8A8AAA] mb-1">Email</p>
              <p className="font-semibold text-[#1A1A2E]">{session.user.email}</p>
            </div>
            <div>
              <p className="text-xs text-[#8A8AAA] mb-1">Role</p>
              <p className="font-semibold text-[#1A1A2E] capitalize">
                {(session.user as any).role || "Unknown"}
              </p>
            </div>
          </div>
        </div>

        {/* Test Actions */}
        <div className="bg-white rounded-2xl border border-[#E8E0D0] shadow-[0_2px_12px_rgba(114,74,106,0.06)] p-6 mb-6">
          <h2 className="text-lg font-bold text-[#1A1A2E] mb-4">Test Actions</h2>
          <div className="flex gap-3">
            <button
              onClick={sendTestNotification}
              className="btn-primary py-2 px-6"
              disabled={!!testResult}
            >
              📨 Send Test Message to Admins
            </button>
            <button onClick={fetchData} className="btn-outline py-2 px-6">
              🔄 Refresh Data
            </button>
          </div>
          {testResult && (
            <div className="mt-4 p-4 bg-[#E1F5FE] rounded-xl border border-[#0277BD]">
              <p className="text-sm text-[#01579B]">{testResult}</p>
            </div>
          )}
        </div>

        {/* Admin Users */}
        <div className="bg-white rounded-2xl border border-[#E8E0D0] shadow-[0_2px_12px_rgba(114,74,106,0.06)] p-6 mb-6">
          <h2 className="text-lg font-bold text-[#1A1A2E] mb-4">
            Admin Users ({admins.length})
          </h2>
          {loading ? (
            <p className="text-[#8A8AAA]">Loading...</p>
          ) : admins.length === 0 ? (
            <div className="p-4 bg-[#FFEBEE] rounded-xl border border-[#C62828]">
              <p className="text-sm text-[#C62828]">
                ⚠️ No admin users found! This is why notifications aren't being sent.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#E8E0D0]">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-[#8A8AAA] uppercase">
                      Name
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-[#8A8AAA] uppercase">
                      Email
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-[#8A8AAA] uppercase">
                      Role
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-[#8A8AAA] uppercase">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {admins.map((admin) => (
                    <tr key={admin.id} className="border-b border-[#F0EAD8]">
                      <td className="py-3 px-4 text-sm text-[#1A1A2E]">{admin.name}</td>
                      <td className="py-3 px-4 text-sm text-[#4A4A6A]">{admin.email}</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-[#F5EDF4] text-[#724A6A]">
                          {admin.role}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {admin.isActive ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-[#E8F5E9] text-[#2E7D32]">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-[#FFEBEE] text-[#C62828]">
                            Inactive
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Notifications */}
        <div className="bg-white rounded-2xl border border-[#E8E0D0] shadow-[0_2px_12px_rgba(114,74,106,0.06)] p-6">
          <h2 className="text-lg font-bold text-[#1A1A2E] mb-4">
            Recent Notifications (Last 20)
          </h2>
          {loading ? (
            <p className="text-[#8A8AAA]">Loading...</p>
          ) : error ? (
            <div className="p-4 bg-[#FFEBEE] rounded-xl border border-[#C62828]">
              <p className="text-sm text-[#C62828]">❌ Error: {error}</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-4 bg-[#FFF3E0] rounded-xl border border-[#E65100]">
              <p className="text-sm text-[#E65100]">
                No notifications found. Try sending a test message!
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E8E0D0]">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-[#8A8AAA] uppercase">
                      Created
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-[#8A8AAA] uppercase">
                      Subject
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-[#8A8AAA] uppercase">
                      Channel
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-[#8A8AAA] uppercase">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-[#8A8AAA] uppercase">
                      User
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {notifications.map((notif) => (
                    <tr key={notif.id} className="border-b border-[#F0EAD8]">
                      <td className="py-3 px-4 text-xs text-[#4A4A6A]">
                        {new Date(notif.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-[#1A1A2E]">
                        <p className="font-semibold">{notif.subject || "No subject"}</p>
                        <p className="text-xs text-[#8A8AAA] line-clamp-1">{notif.body}</p>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                            notif.channel === "PUSH"
                              ? "bg-[#E1F5FE] text-[#0277BD]"
                              : notif.channel === "EMAIL"
                              ? "bg-[#FFF3E0] text-[#E65100]"
                              : "bg-[#F5EDF4] text-[#724A6A]"
                          }`}
                        >
                          {notif.channel}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                            notif.status === "QUEUED"
                              ? "bg-[#FFF3E0] text-[#E65100]"
                              : notif.status === "SENT"
                              ? "bg-[#E8F5E9] text-[#2E7D32]"
                              : "bg-[#FFEBEE] text-[#C62828]"
                          }`}
                        >
                          {notif.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-[#4A4A6A]">
                        {notif.userId.slice(0, 8)}...
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-6 p-6 bg-[#E1F5FE] rounded-2xl border border-[#0277BD]">
          <h3 className="font-bold text-[#01579B] mb-3">📋 How to Use This Debug Panel</h3>
          <ol className="text-sm text-[#01579B] space-y-2 ml-4 list-decimal">
            <li>
              <strong>Check Admin Users:</strong> Verify that admin users exist and are active
            </li>
            <li>
              <strong>Send Test Message:</strong> Click the button to send a test notification to all
              admins
            </li>
            <li>
              <strong>Check Recent Notifications:</strong> Verify that notifications were created with
              status "QUEUED"
            </li>
            <li>
              <strong>Check Bell Icon:</strong> If you're an admin, the bell icon should show a badge
              within 10 seconds
            </li>
            <li>
              <strong>Verify in Database:</strong> If still not working, check the database directly
            </li>
          </ol>
        </div>

        {/* Back Button */}
        <div className="mt-8 text-center">
          <a href="/admin" className="btn-outline py-2 px-6">
            ← Back to Admin Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
