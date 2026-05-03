/**
 * Email Service - Nodemailer Integration
 * Handles all email notifications for bookings, appointments, payments, etc.
 */

import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

// Create reusable transporter
let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!transporter) {
    if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      throw new Error("Email configuration missing in environment variables");
    }

    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT || "587"),
      secure: process.env.EMAIL_PORT === "465", // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  return transporter;
}

// Default sender email
const DEFAULT_FROM = process.env.EMAIL_FROM || process.env.EMAIL_USER || "noreply@bookora.com";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EmailParams {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
}

// ─── Core Email Function ──────────────────────────────────────────────────────

/**
 * Send an email using Nodemailer
 */
export async function sendEmail(params: EmailParams): Promise<boolean> {
  try {
    if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.warn("Email configuration not complete. Email not sent.");
      console.log("Email would have been sent:", {
        to: params.to,
        subject: params.subject,
      });
      return false;
    }

    const transport = getTransporter();

    const info = await transport.sendMail({
      from: params.from || DEFAULT_FROM,
      to: params.to,
      subject: params.subject,
      html: params.html,
      replyTo: params.replyTo,
    });

    console.log("Email sent successfully:", info.messageId);
    return true;
  } catch (error) {
    console.error("Email sending error:", error);
    return false;
  }
}

// ─── Email Templates ──────────────────────────────────────────────────────────

/**
 * Base email template with branding
 */
function emailTemplate(content: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bookora</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #FFFBE9;
      color: #1A1A2E;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .header {
      background: linear-gradient(135deg, #724A6A 0%, #5A3854 100%);
      padding: 40px 20px;
      text-align: center;
    }
    .logo {
      font-size: 32px;
      font-weight: bold;
      color: #ffffff;
      margin: 0;
    }
    .content {
      padding: 40px 30px;
    }
    .button {
      display: inline-block;
      padding: 14px 28px;
      background: linear-gradient(135deg, #724A6A 0%, #5A3854 100%);
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 12px;
      font-weight: 600;
      margin: 20px 0;
    }
    .footer {
      background-color: #F5EDF4;
      padding: 30px;
      text-align: center;
      font-size: 14px;
      color: #4A4A6A;
    }
    .divider {
      height: 1px;
      background-color: #E8E0D0;
      margin: 30px 0;
    }
    .info-box {
      background-color: #FFFBE9;
      border: 2px solid #E8E0D0;
      border-radius: 12px;
      padding: 20px;
      margin: 20px 0;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #E8E0D0;
    }
    .info-row:last-child {
      border-bottom: none;
    }
    .info-label {
      font-weight: 600;
      color: #4A4A6A;
    }
    .info-value {
      color: #1A1A2E;
    }
    h1 {
      color: #1A1A2E;
      font-size: 28px;
      margin: 0 0 20px 0;
    }
    h2 {
      color: #724A6A;
      font-size: 20px;
      margin: 30px 0 15px 0;
    }
    p {
      line-height: 1.6;
      color: #4A4A6A;
      margin: 15px 0;
    }
    .highlight {
      color: #724A6A;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="logo">📅 Bookora</h1>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Bookora. All rights reserved.</p>
      <p>This is an automated email. Please do not reply to this message.</p>
      <p style="margin-top: 20px;">
        <a href="${process.env.NEXT_PUBLIC_SITE_URL}" style="color: #724A6A; text-decoration: none;">Visit Bookora</a> | 
        <a href="${process.env.NEXT_PUBLIC_SITE_URL}/contact-admin" style="color: #724A6A; text-decoration: none;">Contact Support</a>
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

// ─── Booking Email Templates ──────────────────────────────────────────────────

export interface BookingEmailData {
  customerName: string;
  serviceTitle: string;
  dateTime: string;
  duration: string;
  venue?: string;
  bookingId: string;
  amount?: number;
  currency?: string;
}

/**
 * Booking Confirmation Email
 */
export async function sendBookingConfirmationEmail(
  to: string,
  data: BookingEmailData
): Promise<boolean> {
  const content = `
    <h1>🎉 Booking Confirmed!</h1>
    <p>Hi <span class="highlight">${data.customerName}</span>,</p>
    <p>Great news! Your booking has been confirmed. We're looking forward to seeing you!</p>
    
    <div class="info-box">
      <h2>Booking Details</h2>
      <div class="info-row">
        <span class="info-label">Service:</span>
        <span class="info-value">${data.serviceTitle}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Date & Time:</span>
        <span class="info-value">${data.dateTime}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Duration:</span>
        <span class="info-value">${data.duration}</span>
      </div>
      ${data.venue ? `
      <div class="info-row">
        <span class="info-label">Venue:</span>
        <span class="info-value">${data.venue}</span>
      </div>
      ` : ''}
      ${data.amount ? `
      <div class="info-row">
        <span class="info-label">Amount Paid:</span>
        <span class="info-value">${data.currency} ${data.amount}</span>
      </div>
      ` : ''}
      <div class="info-row">
        <span class="info-label">Booking ID:</span>
        <span class="info-value">${data.bookingId}</span>
      </div>
    </div>

    <p style="text-align: center;">
      <a href="${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/bookings/${data.bookingId}" class="button">
        View Booking Details
      </a>
    </p>

    <div class="divider"></div>

    <h2>What's Next?</h2>
    <p>✅ We've sent a confirmation to the service provider</p>
    <p>✅ You'll receive a reminder before your appointment</p>
    <p>✅ If you need to reschedule or cancel, you can do so from your dashboard</p>

    <p>If you have any questions, feel free to <a href="${process.env.NEXT_PUBLIC_SITE_URL}/contact-admin" style="color: #724A6A;">contact us</a>.</p>
  `;

  return sendEmail({
    to,
    subject: `Booking Confirmed: ${data.serviceTitle}`,
    html: emailTemplate(content),
  });
}

/**
 * Booking Pending Email (Manual Confirmation Required)
 */
export async function sendBookingPendingEmail(
  to: string,
  data: BookingEmailData
): Promise<boolean> {
  const content = `
    <h1>📋 Booking Request Received</h1>
    <p>Hi <span class="highlight">${data.customerName}</span>,</p>
    <p>We've received your booking request for <strong>${data.serviceTitle}</strong>. The service provider will review and confirm it shortly.</p>
    
    <div class="info-box">
      <h2>Booking Details</h2>
      <div class="info-row">
        <span class="info-label">Service:</span>
        <span class="info-value">${data.serviceTitle}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Requested Date & Time:</span>
        <span class="info-value">${data.dateTime}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Duration:</span>
        <span class="info-value">${data.duration}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Booking ID:</span>
        <span class="info-value">${data.bookingId}</span>
      </div>
    </div>

    <p>We'll notify you as soon as the service provider confirms your booking.</p>

    <p style="text-align: center;">
      <a href="${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/bookings/${data.bookingId}" class="button">
        View Booking Status
      </a>
    </p>
  `;

  return sendEmail({
    to,
    subject: `Booking Request Received: ${data.serviceTitle}`,
    html: emailTemplate(content),
  });
}

/**
 * Booking Cancelled Email
 */
export async function sendBookingCancelledEmail(
  to: string,
  data: BookingEmailData & { reason?: string }
): Promise<boolean> {
  const content = `
    <h1>❌ Booking Cancelled</h1>
    <p>Hi <span class="highlight">${data.customerName}</span>,</p>
    <p>Your booking for <strong>${data.serviceTitle}</strong> has been cancelled.</p>
    
    <div class="info-box">
      <h2>Cancelled Booking</h2>
      <div class="info-row">
        <span class="info-label">Service:</span>
        <span class="info-value">${data.serviceTitle}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Date & Time:</span>
        <span class="info-value">${data.dateTime}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Booking ID:</span>
        <span class="info-value">${data.bookingId}</span>
      </div>
      ${data.reason ? `
      <div class="info-row">
        <span class="info-label">Reason:</span>
        <span class="info-value">${data.reason}</span>
      </div>
      ` : ''}
    </div>

    ${data.amount ? `
    <p>If you made a payment, a refund will be processed within 5-7 business days.</p>
    ` : ''}

    <p>You can book another appointment anytime from our website.</p>

    <p style="text-align: center;">
      <a href="${process.env.NEXT_PUBLIC_SITE_URL}" class="button">
        Browse Services
      </a>
    </p>
  `;

  return sendEmail({
    to,
    subject: `Booking Cancelled: ${data.serviceTitle}`,
    html: emailTemplate(content),
  });
}

/**
 * Booking Reminder Email
 */
export async function sendBookingReminderEmail(
  to: string,
  data: BookingEmailData
): Promise<boolean> {
  const content = `
    <h1>⏰ Reminder: Upcoming Appointment</h1>
    <p>Hi <span class="highlight">${data.customerName}</span>,</p>
    <p>This is a friendly reminder about your upcoming appointment.</p>
    
    <div class="info-box">
      <h2>Appointment Details</h2>
      <div class="info-row">
        <span class="info-label">Service:</span>
        <span class="info-value">${data.serviceTitle}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Date & Time:</span>
        <span class="info-value">${data.dateTime}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Duration:</span>
        <span class="info-value">${data.duration}</span>
      </div>
      ${data.venue ? `
      <div class="info-row">
        <span class="info-label">Venue:</span>
        <span class="info-value">${data.venue}</span>
      </div>
      ` : ''}
    </div>

    <p>Please arrive on time. If you need to reschedule or cancel, please do so at least 24 hours in advance.</p>

    <p style="text-align: center;">
      <a href="${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/bookings/${data.bookingId}" class="button">
        View Booking Details
      </a>
    </p>
  `;

  return sendEmail({
    to,
    subject: `Reminder: ${data.serviceTitle} - ${data.dateTime}`,
    html: emailTemplate(content),
  });
}

// ─── Organiser Email Templates ────────────────────────────────────────────────

/**
 * New Booking Request Email (for Organiser)
 */
export async function sendNewBookingRequestEmail(
  to: string,
  data: BookingEmailData & { customerEmail: string; customerPhone?: string }
): Promise<boolean> {
  const content = `
    <h1>🔔 New Booking Request</h1>
    <p>You have a new booking request for <strong>${data.serviceTitle}</strong>.</p>
    
    <div class="info-box">
      <h2>Booking Details</h2>
      <div class="info-row">
        <span class="info-label">Customer:</span>
        <span class="info-value">${data.customerName}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Email:</span>
        <span class="info-value">${data.customerEmail}</span>
      </div>
      ${data.customerPhone ? `
      <div class="info-row">
        <span class="info-label">Phone:</span>
        <span class="info-value">${data.customerPhone}</span>
      </div>
      ` : ''}
      <div class="info-row">
        <span class="info-label">Service:</span>
        <span class="info-value">${data.serviceTitle}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Date & Time:</span>
        <span class="info-value">${data.dateTime}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Duration:</span>
        <span class="info-value">${data.duration}</span>
      </div>
    </div>

    <p>Please review and confirm this booking as soon as possible.</p>

    <p style="text-align: center;">
      <a href="${process.env.NEXT_PUBLIC_SITE_URL}/admin/bookings" class="button">
        Review Booking
      </a>
    </p>
  `;

  return sendEmail({
    to,
    subject: `New Booking Request: ${data.serviceTitle}`,
    html: emailTemplate(content),
  });
}

// ─── Payment Email Templates ──────────────────────────────────────────────────

/**
 * Payment Received Email
 */
export async function sendPaymentReceivedEmail(
  to: string,
  data: {
    customerName: string;
    amount: number;
    currency: string;
    serviceTitle: string;
    paymentId: string;
    bookingId: string;
  }
): Promise<boolean> {
  const content = `
    <h1>✅ Payment Received</h1>
    <p>Hi <span class="highlight">${data.customerName}</span>,</p>
    <p>We've successfully received your payment. Thank you!</p>
    
    <div class="info-box">
      <h2>Payment Details</h2>
      <div class="info-row">
        <span class="info-label">Amount:</span>
        <span class="info-value">${data.currency} ${data.amount}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Service:</span>
        <span class="info-value">${data.serviceTitle}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Payment ID:</span>
        <span class="info-value">${data.paymentId}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Booking ID:</span>
        <span class="info-value">${data.bookingId}</span>
      </div>
    </div>

    <p>Your booking is now confirmed. We'll send you a reminder before your appointment.</p>

    <p style="text-align: center;">
      <a href="${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/bookings/${data.bookingId}" class="button">
        View Booking
      </a>
    </p>
  `;

  return sendEmail({
    to,
    subject: `Payment Received - ${data.currency} ${data.amount}`,
    html: emailTemplate(content),
  });
}

/**
 * Refund Processed Email
 */
export async function sendRefundProcessedEmail(
  to: string,
  data: {
    customerName: string;
    amount: number;
    currency: string;
    serviceTitle: string;
    refundId: string;
  }
): Promise<boolean> {
  const content = `
    <h1>💰 Refund Processed</h1>
    <p>Hi <span class="highlight">${data.customerName}</span>,</p>
    <p>Your refund has been processed successfully.</p>
    
    <div class="info-box">
      <h2>Refund Details</h2>
      <div class="info-row">
        <span class="info-label">Amount:</span>
        <span class="info-value">${data.currency} ${data.amount}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Service:</span>
        <span class="info-value">${data.serviceTitle}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Refund ID:</span>
        <span class="info-value">${data.refundId}</span>
      </div>
    </div>

    <p>The refund will appear in your account within 5-7 business days, depending on your bank.</p>

    <p>If you have any questions, please <a href="${process.env.NEXT_PUBLIC_SITE_URL}/contact-admin" style="color: #724A6A;">contact our support team</a>.</p>
  `;

  return sendEmail({
    to,
    subject: `Refund Processed - ${data.currency} ${data.amount}`,
    html: emailTemplate(content),
  });
}

// ─── Service Email Templates ──────────────────────────────────────────────────

/**
 * Service Published Email (for Organiser)
 */
export async function sendServicePublishedEmail(
  to: string,
  data: {
    organiserName: string;
    serviceTitle: string;
    serviceId: string;
  }
): Promise<boolean> {
  const content = `
    <h1>🚀 Service Published!</h1>
    <p>Hi <span class="highlight">${data.organiserName}</span>,</p>
    <p>Great news! Your service "<strong>${data.serviceTitle}</strong>" is now live and accepting bookings.</p>
    
    <p>Customers can now discover and book your service on Bookora.</p>

    <p style="text-align: center;">
      <a href="${process.env.NEXT_PUBLIC_SITE_URL}/services/${data.serviceId}" class="button">
        View Service Page
      </a>
    </p>

    <div class="divider"></div>

    <h2>Next Steps</h2>
    <p>✅ Share your service link with potential customers</p>
    <p>✅ Monitor bookings from your dashboard</p>
    <p>✅ Respond promptly to booking requests</p>
  `;

  return sendEmail({
    to,
    subject: `Service Published: ${data.serviceTitle}`,
    html: emailTemplate(content),
  });
}

// ─── Role Change Email ────────────────────────────────────────────────────────

/**
 * Role Changed Email
 */
export async function sendRoleChangedEmail(
  to: string,
  data: {
    userName: string;
    oldRole: string;
    newRole: string;
  }
): Promise<boolean> {
  const content = `
    <h1>🔑 Your Role Has Been Updated</h1>
    <p>Hi <span class="highlight">${data.userName}</span>,</p>
    <p>Your account role has been changed from <strong>${data.oldRole}</strong> to <strong>${data.newRole}</strong>.</p>
    
    <div class="info-box">
      <h2>What This Means</h2>
      ${data.newRole === 'admin' ? `
        <p>✅ You now have full administrative access</p>
        <p>✅ You can manage users, services, and bookings</p>
        <p>✅ You can view reports and analytics</p>
      ` : data.newRole === 'organiser' ? `
        <p>✅ You can now create and manage services</p>
        <p>✅ You can accept and manage bookings</p>
        <p>✅ You can view your service analytics</p>
      ` : `
        <p>✅ You can browse and book services</p>
        <p>✅ You can manage your bookings</p>
        <p>✅ You can view your booking history</p>
      `}
    </div>

    <p style="text-align: center;">
      <a href="${process.env.NEXT_PUBLIC_SITE_URL}/dashboard" class="button">
        Go to Dashboard
      </a>
    </p>

    <p>If you didn't request this change or have any questions, please <a href="${process.env.NEXT_PUBLIC_SITE_URL}/contact-admin" style="color: #724A6A;">contact support</a> immediately.</p>
  `;

  return sendEmail({
    to,
    subject: `Your Role Has Been Updated to ${data.newRole}`,
    html: emailTemplate(content),
  });
}

// ─── Welcome Email ────────────────────────────────────────────────────────────

/**
 * Welcome Email (for new users)
 */
export async function sendWelcomeEmail(
  to: string,
  data: {
    userName: string;
  }
): Promise<boolean> {
  const content = `
    <h1>👋 Welcome to Bookora!</h1>
    <p>Hi <span class="highlight">${data.userName}</span>,</p>
    <p>Welcome to Bookora! We're excited to have you on board.</p>
    
    <div class="info-box">
      <h2>Get Started</h2>
      <p>✅ Browse available services</p>
      <p>✅ Book appointments with ease</p>
      <p>✅ Manage your bookings from your dashboard</p>
      <p>✅ Receive timely reminders</p>
    </div>

    <p style="text-align: center;">
      <a href="${process.env.NEXT_PUBLIC_SITE_URL}" class="button">
        Explore Services
      </a>
    </p>

    <div class="divider"></div>

    <h2>Need Help?</h2>
    <p>If you have any questions or need assistance, our support team is here to help.</p>
    <p style="text-align: center;">
      <a href="${process.env.NEXT_PUBLIC_SITE_URL}/contact-admin" style="color: #724A6A; text-decoration: none;">Contact Support</a>
    </p>
  `;

  return sendEmail({
    to,
    subject: "Welcome to Bookora! 🎉",
    html: emailTemplate(content),
  });
}
