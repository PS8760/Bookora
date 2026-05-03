/**
 * Notification System — Real-time & Daily Updates
 * 
 * Handles:
 * - Booking confirmations, cancellations, reschedules
 * - Service creation/updates
 * - Role changes
 * - Daily summaries
 * - Real-time in-app notifications
 * - Email notifications
 */

import prisma from "@/prisma/prisma";
import { NotificationChannel } from "@/prisma/generated/prisma";
import * as EmailService from "./email";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NotificationPayload {
  userId: string;
  bookingId?: string;
  subject?: string;
  body: string;
  channels?: NotificationChannel[];
  metadata?: Record<string, any>;
  emailData?: any; // Additional data for email templates
}

export interface InAppNotification {
  id: string;
  type: "success" | "info" | "warning" | "error";
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  metadata?: Record<string, any>;
}

// ─── Notification Templates ───────────────────────────────────────────────────

export const NotificationTemplates = {
  // Booking notifications
  BOOKING_CONFIRMED: (customerName: string, serviceTitle: string, dateTime: string) => ({
    subject: "Booking Confirmed! 🎉",
    body: `Hi ${customerName}! Your booking for "${serviceTitle}" on ${dateTime} has been confirmed. We look forward to seeing you!`,
  }),

  BOOKING_CANCELLED: (customerName: string, serviceTitle: string, dateTime: string) => ({
    subject: "Booking Cancelled",
    body: `Hi ${customerName}, your booking for "${serviceTitle}" on ${dateTime} has been cancelled. If you have any questions, please contact us.`,
  }),

  BOOKING_RESCHEDULED: (customerName: string, serviceTitle: string, oldDateTime: string, newDateTime: string) => ({
    subject: "Booking Rescheduled",
    body: `Hi ${customerName}, your booking for "${serviceTitle}" has been rescheduled from ${oldDateTime} to ${newDateTime}.`,
  }),

  BOOKING_REMINDER: (customerName: string, serviceTitle: string, dateTime: string) => ({
    subject: "Reminder: Upcoming Appointment",
    body: `Hi ${customerName}, this is a reminder that you have an appointment for "${serviceTitle}" on ${dateTime}. See you soon!`,
  }),

  BOOKING_PENDING: (customerName: string, serviceTitle: string, dateTime: string) => ({
    subject: "Booking Request Received",
    body: `Hi ${customerName}, we've received your booking request for "${serviceTitle}" on ${dateTime}. We'll confirm it shortly!`,
  }),

  BOOKING_REJECTED: (customerName: string, serviceTitle: string, dateTime: string, reason?: string) => ({
    subject: "Booking Request Declined",
    body: `Hi ${customerName}, unfortunately we cannot accommodate your booking request for "${serviceTitle}" on ${dateTime}.${reason ? ` Reason: ${reason}` : ""}`,
  }),

  // Organiser notifications
  NEW_BOOKING_REQUEST: (organiserName: string, customerName: string, serviceTitle: string, dateTime: string) => ({
    subject: "New Booking Request",
    body: `Hi ${organiserName}, ${customerName} has requested a booking for "${serviceTitle}" on ${dateTime}. Please review and confirm.`,
  }),

  BOOKING_COMPLETED: (organiserName: string, customerName: string, serviceTitle: string) => ({
    subject: "Booking Completed",
    body: `Hi ${organiserName}, the booking for ${customerName} for "${serviceTitle}" has been marked as completed.`,
  }),

  // Service notifications
  SERVICE_CREATED: (organiserName: string, serviceTitle: string) => ({
    subject: "Service Created Successfully",
    body: `Hi ${organiserName}, your service "${serviceTitle}" has been created. Configure schedules and publish it to start accepting bookings!`,
  }),

  SERVICE_PUBLISHED: (organiserName: string, serviceTitle: string) => ({
    subject: "Service Published! 🚀",
    body: `Hi ${organiserName}, your service "${serviceTitle}" is now live and accepting bookings!`,
  }),

  SERVICE_UNPUBLISHED: (organiserName: string, serviceTitle: string) => ({
    subject: "Service Unpublished",
    body: `Hi ${organiserName}, your service "${serviceTitle}" has been unpublished and is no longer accepting bookings.`,
  }),

  // Role change notifications
  ROLE_CHANGED: (userName: string, oldRole: string, newRole: string) => ({
    subject: "Your Role Has Been Updated",
    body: `Hi ${userName}, your account role has been changed from ${oldRole} to ${newRole}. You now have access to ${newRole} features!`,
  }),

  // Daily summary
  DAILY_SUMMARY_ORGANISER: (organiserName: string, stats: {
    todayBookings: number;
    pendingBookings: number;
    revenue: number;
    upcomingAppointments: number;
  }) => ({
    subject: "Your Daily Summary 📊",
    body: `Hi ${organiserName}, here's your summary for today:
    
• ${stats.todayBookings} new bookings
• ${stats.pendingBookings} pending requests
• ₹${stats.revenue.toLocaleString()} revenue
• ${stats.upcomingAppointments} upcoming appointments

Have a great day!`,
  }),

  DAILY_SUMMARY_CUSTOMER: (customerName: string, upcomingCount: number, nextAppointment?: string) => ({
    subject: "Your Upcoming Appointments",
    body: `Hi ${customerName}, you have ${upcomingCount} upcoming appointment${upcomingCount !== 1 ? "s" : ""}.${nextAppointment ? ` Your next appointment is ${nextAppointment}.` : ""}`,
  }),

  // Payment notifications
  PAYMENT_RECEIVED: (customerName: string, amount: number, currency: string, serviceTitle: string) => ({
    subject: "Payment Received",
    body: `Hi ${customerName}, we've received your payment of ${currency === "INR" ? "₹" : currency}${amount.toLocaleString()} for "${serviceTitle}". Thank you!`,
  }),

  PAYMENT_REFUNDED: (customerName: string, amount: number, currency: string, serviceTitle: string) => ({
    subject: "Refund Processed",
    body: `Hi ${customerName}, your refund of ${currency === "INR" ? "₹" : currency}${amount.toLocaleString()} for "${serviceTitle}" has been processed.`,
  }),
};

// ─── Core Functions ───────────────────────────────────────────────────────────

/**
 * Send a notification to a user across multiple channels
 */
export async function sendNotification(payload: NotificationPayload): Promise<void> {
  const channels = payload.channels ?? [NotificationChannel.EMAIL, NotificationChannel.PUSH];

  // Get user email
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { email: true, name: true },
  });

  if (!user) {
    console.error(`User not found: ${payload.userId}`);
    return;
  }

  // Create notification records for each channel
  const notifications = channels.map((channel) => ({
    userId: payload.userId,
    bookingId: payload.bookingId,
    channel,
    subject: payload.subject,
    body: payload.body,
    status: "QUEUED" as const,
  }));

  await prisma.notification.createMany({
    data: notifications,
  });

  // Send email if EMAIL channel is included
  if (channels.includes(NotificationChannel.EMAIL)) {
    try {
      // Send email using the email service
      const emailSent = await EmailService.sendEmail({
        to: user.email,
        subject: payload.subject || "Notification from Bookora",
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>${payload.subject || "Notification"}</h2>
            <p>${payload.body.replace(/\n/g, "<br>")}</p>
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
            <p style="color: #666; font-size: 12px;">
              This is an automated notification from Bookora.
              <br>
              <a href="${process.env.NEXT_PUBLIC_SITE_URL}">Visit Bookora</a>
            </p>
          </div>
        `,
      });

      // Update notification status based on email result
      await prisma.notification.updateMany({
        where: {
          userId: payload.userId,
          status: "QUEUED",
          channel: NotificationChannel.EMAIL,
          subject: payload.subject,
        },
        data: {
          status: emailSent ? "SENT" : "FAILED",
          sentAt: emailSent ? new Date() : undefined,
          failureReason: emailSent ? undefined : "Email sending failed",
        },
      });
    } catch (error) {
      console.error("Failed to send email notification:", error);
      
      // Mark as failed
      await prisma.notification.updateMany({
        where: {
          userId: payload.userId,
          status: "QUEUED",
          channel: NotificationChannel.EMAIL,
        },
        data: {
          status: "FAILED",
          failureReason: "Email sending error",
        },
      });
    }
  }

  // PUSH notifications are handled by the in-app notification system
  // They remain in QUEUED status until read by the user
}

/**
 * Get in-app notifications for a user
 */
export async function getInAppNotifications(
  userId: string,
  options?: { limit?: number; unreadOnly?: boolean }
): Promise<InAppNotification[]> {
  const notifications = await prisma.notification.findMany({
    where: {
      userId,
      channel: NotificationChannel.PUSH,
      ...(options?.unreadOnly ? { status: "QUEUED" } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: options?.limit ?? 50,
    include: {
      booking: {
        select: {
          id: true,
          service: { select: { title: true } },
          providerSlot: { select: { startTime: true } },
        },
      },
    },
  });

  return notifications.map((n) => ({
    id: n.id,
    type: inferNotificationType(n.subject ?? ""),
    title: n.subject ?? "Notification",
    message: n.body,
    timestamp: n.createdAt,
    read: n.status === "SENT",
    actionUrl: n.bookingId ? `/dashboard/bookings/${n.bookingId}` : undefined,
    metadata: n.booking
      ? {
          bookingId: n.booking.id,
          serviceTitle: n.booking.service.title,
          appointmentTime: n.booking.providerSlot.startTime,
        }
      : undefined,
  }));
}

/**
 * Mark notifications as read
 */
export async function markNotificationsAsRead(
  userId: string,
  notificationIds?: string[]
): Promise<void> {
  await prisma.notification.updateMany({
    where: {
      userId,
      channel: NotificationChannel.PUSH,
      ...(notificationIds ? { id: { in: notificationIds } } : {}),
    },
    data: {
      status: "SENT",
      sentAt: new Date(),
    },
  });
}

/**
 * Get unread notification count
 */
export async function getUnreadCount(userId: string): Promise<number> {
  return await prisma.notification.count({
    where: {
      userId,
      channel: NotificationChannel.PUSH,
      status: "QUEUED",
    },
  });
}

// ─── Notification Triggers ────────────────────────────────────────────────────

/**
 * Trigger booking confirmation notification
 */
export async function notifyBookingConfirmed(bookingId: string): Promise<void> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      customer: { select: { id: true, name: true, email: true } },
      service: { select: { title: true, organiserId: true } },
      providerSlot: { select: { startTime: true } },
    },
  });

  if (!booking) return;

  const dateTime = new Date(booking.providerSlot.startTime).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const template = NotificationTemplates.BOOKING_CONFIRMED(
    booking.customer.name,
    booking.service.title,
    dateTime
  );

  // Notify customer
  await sendNotification({
    userId: booking.customer.id,
    bookingId: booking.id,
    ...template,
  });

  // Notify organiser
  const organiser = await prisma.user.findUnique({
    where: { id: booking.service.organiserId },
    select: { name: true },
  });

  if (organiser) {
    const organiserTemplate = NotificationTemplates.BOOKING_COMPLETED(
      organiser.name,
      booking.customer.name,
      booking.service.title
    );

    await sendNotification({
      userId: booking.service.organiserId,
      bookingId: booking.id,
      ...organiserTemplate,
    });
  }
}

/**
 * Trigger booking cancellation notification
 */
export async function notifyBookingCancelled(bookingId: string): Promise<void> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      customer: { select: { id: true, name: true } },
      service: { select: { title: true, organiserId: true } },
      providerSlot: { select: { startTime: true } },
    },
  });

  if (!booking) return;

  const dateTime = new Date(booking.providerSlot.startTime).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const template = NotificationTemplates.BOOKING_CANCELLED(
    booking.customer.name,
    booking.service.title,
    dateTime
  );

  await sendNotification({
    userId: booking.customer.id,
    bookingId: booking.id,
    ...template,
  });
}

/**
 * Trigger new booking request notification (for manual confirmation)
 */
export async function notifyNewBookingRequest(bookingId: string): Promise<void> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      customer: { select: { id: true, name: true } },
      service: { select: { title: true, organiserId: true } },
      providerSlot: { select: { startTime: true } },
    },
  });

  if (!booking) return;

  const organiser = await prisma.user.findUnique({
    where: { id: booking.service.organiserId },
    select: { name: true },
  });

  if (!organiser) return;

  const dateTime = new Date(booking.providerSlot.startTime).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const template = NotificationTemplates.NEW_BOOKING_REQUEST(
    organiser.name,
    booking.customer.name,
    booking.service.title,
    dateTime
  );

  await sendNotification({
    userId: booking.service.organiserId,
    bookingId: booking.id,
    ...template,
  });

  // Also notify customer that request was received
  const customerTemplate = NotificationTemplates.BOOKING_PENDING(
    booking.customer.name,
    booking.service.title,
    dateTime
  );

  await sendNotification({
    userId: booking.customer.id,
    bookingId: booking.id,
    ...customerTemplate,
  });
}

/**
 * Trigger service published notification
 */
export async function notifyServicePublished(serviceId: string): Promise<void> {
  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    include: {
      organiser: { select: { id: true, name: true } },
    },
  });

  if (!service) return;

  const template = NotificationTemplates.SERVICE_PUBLISHED(
    service.organiser.name,
    service.title
  );

  await sendNotification({
    userId: service.organiserId,
    ...template,
  });
}

/**
 * Trigger role change notification
 */
export async function notifyRoleChanged(
  userId: string,
  oldRole: string,
  newRole: string
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true },
  });

  if (!user) return;

  const template = NotificationTemplates.ROLE_CHANGED(user.name, oldRole, newRole);

  await sendNotification({
    userId,
    ...template,
  });
}

// ─── Helper Functions ─────────────────────────────────────────────────────────

function inferNotificationType(subject: string): "success" | "info" | "warning" | "error" {
  if (subject.includes("Confirmed") || subject.includes("Success") || subject.includes("Published")) {
    return "success";
  }
  if (subject.includes("Cancelled") || subject.includes("Declined") || subject.includes("Failed")) {
    return "error";
  }
  if (subject.includes("Reminder") || subject.includes("Pending")) {
    return "warning";
  }
  return "info";
}
