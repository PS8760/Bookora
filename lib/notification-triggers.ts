/**
 * Notification Triggers - Enhanced with Email Templates
 * Triggers notifications with proper email templates for various events
 */

import prisma from "@/prisma/prisma";
import { sendNotification } from "./notifications";
import * as EmailService from "./email";

// ─── Booking Notifications ────────────────────────────────────────────────────

/**
 * Trigger booking confirmation notification with email
 */
export async function notifyBookingConfirmed(bookingId: string): Promise<void> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      customer: { select: { id: true, name: true, email: true } },
      service: { select: { title: true, organiserId: true, durationMinutes: true, venue: true } },
      providerSlot: { select: { startTime: true, endTime: true } },
    },
  });

  if (!booking) return;

  const dateTime = new Date(booking.providerSlot.startTime).toLocaleString("en-IN", {
    dateStyle: "long",
    timeStyle: "short",
  });

  const duration = `${booking.service.durationMinutes} minutes`;

  // Send email using template
  await EmailService.sendBookingConfirmationEmail(booking.customer.email, {
    customerName: booking.customer.name,
    serviceTitle: booking.service.title,
    dateTime,
    duration,
    venue: booking.service.venue || undefined,
    bookingId: booking.id,
  });

  // Send in-app notification
  await sendNotification({
    userId: booking.customer.id,
    bookingId: booking.id,
    subject: "Booking Confirmed! 🎉",
    body: `Your booking for "${booking.service.title}" on ${dateTime} has been confirmed.`,
    channels: ["PUSH"], // Email already sent above
  });
}

/**
 * Trigger booking pending notification
 */
export async function notifyBookingPending(bookingId: string): Promise<void> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      customer: { select: { id: true, name: true, email: true } },
      service: { select: { title: true, durationMinutes: true } },
      providerSlot: { select: { startTime: true } },
    },
  });

  if (!booking) return;

  const dateTime = new Date(booking.providerSlot.startTime).toLocaleString("en-IN", {
    dateStyle: "long",
    timeStyle: "short",
  });

  const duration = `${booking.service.durationMinutes} minutes`;

  // Send email using template
  await EmailService.sendBookingPendingEmail(booking.customer.email, {
    customerName: booking.customer.name,
    serviceTitle: booking.service.title,
    dateTime,
    duration,
    bookingId: booking.id,
  });

  // Send in-app notification
  await sendNotification({
    userId: booking.customer.id,
    bookingId: booking.id,
    subject: "Booking Request Received",
    body: `We've received your booking request for "${booking.service.title}". We'll confirm it shortly!`,
    channels: ["PUSH"],
  });
}

/**
 * Trigger booking cancelled notification
 */
export async function notifyBookingCancelled(
  bookingId: string,
  reason?: string
): Promise<void> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      customer: { select: { id: true, name: true, email: true } },
      service: { select: { title: true, durationMinutes: true } },
      providerSlot: { select: { startTime: true } },
    },
  });

  if (!booking) return;

  const dateTime = new Date(booking.providerSlot.startTime).toLocaleString("en-IN", {
    dateStyle: "long",
    timeStyle: "short",
  });

  const duration = `${booking.service.durationMinutes} minutes`;

  // Send email using template
  await EmailService.sendBookingCancelledEmail(booking.customer.email, {
    customerName: booking.customer.name,
    serviceTitle: booking.service.title,
    dateTime,
    duration,
    bookingId: booking.id,
    reason,
  });

  // Send in-app notification
  await sendNotification({
    userId: booking.customer.id,
    bookingId: booking.id,
    subject: "Booking Cancelled",
    body: `Your booking for "${booking.service.title}" has been cancelled.${reason ? ` Reason: ${reason}` : ""}`,
    channels: ["PUSH"],
  });
}

/**
 * Trigger booking reminder notification
 */
export async function notifyBookingReminder(bookingId: string): Promise<void> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      customer: { select: { id: true, name: true, email: true } },
      service: { select: { title: true, durationMinutes: true, venue: true } },
      providerSlot: { select: { startTime: true } },
    },
  });

  if (!booking) return;

  const dateTime = new Date(booking.providerSlot.startTime).toLocaleString("en-IN", {
    dateStyle: "long",
    timeStyle: "short",
  });

  const duration = `${booking.service.durationMinutes} minutes`;

  // Send email using template
  await EmailService.sendBookingReminderEmail(booking.customer.email, {
    customerName: booking.customer.name,
    serviceTitle: booking.service.title,
    dateTime,
    duration,
    venue: booking.service.venue || undefined,
    bookingId: booking.id,
  });

  // Send in-app notification
  await sendNotification({
    userId: booking.customer.id,
    bookingId: booking.id,
    subject: "Reminder: Upcoming Appointment",
    body: `Reminder: You have an appointment for "${booking.service.title}" on ${dateTime}.`,
    channels: ["PUSH"],
  });
}

/**
 * Notify organiser of new booking request
 */
export async function notifyOrganiserNewBooking(bookingId: string): Promise<void> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      customer: { select: { name: true, email: true } },
      service: { 
        select: { 
          title: true, 
          organiserId: true,
          durationMinutes: true,
        } 
      },
      providerSlot: { select: { startTime: true } },
    },
  });

  if (!booking) return;

  const organiser = await prisma.user.findUnique({
    where: { id: booking.service.organiserId },
    select: { name: true, email: true },
  });

  if (!organiser) return;

  const dateTime = new Date(booking.providerSlot.startTime).toLocaleString("en-IN", {
    dateStyle: "long",
    timeStyle: "short",
  });

  const duration = `${booking.service.durationMinutes} minutes`;

  // Send email using template
  await EmailService.sendNewBookingRequestEmail(organiser.email, {
    customerName: booking.customer.name,
    customerEmail: booking.customer.email,
    serviceTitle: booking.service.title,
    dateTime,
    duration,
    bookingId: booking.id,
  });

  // Send in-app notification
  await sendNotification({
    userId: booking.service.organiserId,
    bookingId: booking.id,
    subject: "New Booking Request",
    body: `${booking.customer.name} has requested a booking for "${booking.service.title}" on ${dateTime}.`,
    channels: ["PUSH"],
  });
}

// ─── Payment Notifications ────────────────────────────────────────────────────

/**
 * Notify payment received
 */
export async function notifyPaymentReceived(paymentId: string): Promise<void> {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      booking: {
        include: {
          customer: { select: { id: true, name: true, email: true } },
          service: { select: { title: true } },
        },
      },
    },
  });

  if (!payment) return;

  // Send email using template
  await EmailService.sendPaymentReceivedEmail(payment.booking.customer.email, {
    customerName: payment.booking.customer.name,
    amount: Number(payment.amount),
    currency: payment.currency,
    serviceTitle: payment.booking.service.title,
    paymentId: payment.id,
    bookingId: payment.bookingId,
  });

  // Send in-app notification
  await sendNotification({
    userId: payment.booking.customerId,
    bookingId: payment.bookingId,
    subject: "Payment Received",
    body: `We've received your payment of ${payment.currency} ${payment.amount} for "${payment.booking.service.title}".`,
    channels: ["PUSH"],
  });
}

/**
 * Notify refund processed
 */
export async function notifyRefundProcessed(paymentId: string): Promise<void> {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      booking: {
        include: {
          customer: { select: { id: true, name: true, email: true } },
          service: { select: { title: true } },
        },
      },
    },
  });

  if (!payment) return;

  // Send email using template
  await EmailService.sendRefundProcessedEmail(payment.booking.customer.email, {
    customerName: payment.booking.customer.name,
    amount: Number(payment.amount),
    currency: payment.currency,
    serviceTitle: payment.booking.service.title,
    refundId: payment.id,
  });

  // Send in-app notification
  await sendNotification({
    userId: payment.booking.customerId,
    bookingId: payment.bookingId,
    subject: "Refund Processed",
    body: `Your refund of ${payment.currency} ${payment.amount} has been processed.`,
    channels: ["PUSH"],
  });
}

// ─── Service Notifications ────────────────────────────────────────────────────

/**
 * Notify service published
 */
export async function notifyServicePublished(serviceId: string): Promise<void> {
  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    include: {
      organiser: { select: { id: true, name: true, email: true } },
    },
  });

  if (!service) return;

  // Send email using template
  await EmailService.sendServicePublishedEmail(service.organiser.email, {
    organiserName: service.organiser.name,
    serviceTitle: service.title,
    serviceId: service.id,
  });

  // Send in-app notification
  await sendNotification({
    userId: service.organiserId,
    subject: "Service Published! 🚀",
    body: `Your service "${service.title}" is now live and accepting bookings!`,
    channels: ["PUSH"],
  });
}

// ─── Role Change Notifications ────────────────────────────────────────────────

/**
 * Notify role changed
 */
export async function notifyRoleChanged(
  userId: string,
  oldRole: string,
  newRole: string
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  });

  if (!user) return;

  // Send email using template
  await EmailService.sendRoleChangedEmail(user.email, {
    userName: user.name,
    oldRole,
    newRole,
  });

  // Send in-app notification
  await sendNotification({
    userId,
    subject: "Your Role Has Been Updated",
    body: `Your account role has been changed from ${oldRole} to ${newRole}.`,
    channels: ["PUSH"],
  });
}

// ─── Welcome Email ────────────────────────────────────────────────────────────

/**
 * Send welcome email to new user
 */
export async function sendWelcomeEmail(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  });

  if (!user) return;

  // Send welcome email
  await EmailService.sendWelcomeEmail(user.email, {
    userName: user.name,
  });
}
