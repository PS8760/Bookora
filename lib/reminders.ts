import prisma from "@/prisma/prisma";
import { sendBookingConfirmationEmail } from "./email";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT || "587"),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export async function sendBookingReminder(
  to: string, 
  customerName: string, 
  serviceName: string, 
  startTime: Date, 
  selectedMode: string | null,
  venueSnapshot: string | null,
  meetingLink?: string | null
) {
  const mailOptions = {
    from: `"Bookora" <${process.env.EMAIL_FROM}>`,
    to,
    subject: `Reminder: Appointment starting soon - ${serviceName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #724A6A;">Appointment Reminder</h2>
        <p>Hi ${customerName},</p>
        <p>Your appointment for <strong>${serviceName}</strong> is starting in about 30 minutes.</p>
        <div style="background-color: #f5edf4; padding: 15px; border-radius: 10px; margin: 20px 0; border: 1px solid #d4b8cf;">
          <p style="margin: 0;"><strong>Starts at:</strong> ${startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
          <p style="margin: 5px 0 0 0;"><strong>Delivery Mode:</strong> ${selectedMode === "VIRTUAL" ? "Virtual Meeting" : selectedMode === "PHYSICAL" ? "Physical Visit" : "Standard"}</p>
          ${meetingLink ? `
          <div style="margin-top: 15px;">
            <a href="${meetingLink}" style="background-color: #724A6A; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Join Meeting Now</a>
          </div>
          ` : ""}
          ${selectedMode === "PHYSICAL" && venueSnapshot ? `
          <div style="margin-top: 15px;">
            <p style="margin: 0 0 5px 0;"><strong>Venue:</strong></p>
            <p style="margin: 0;">📍 ${venueSnapshot}</p>
          </div>
          ` : ""}
        </div>
        <p>See you there!</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #777;">Thank you for using Bookora!</p>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
}

/**
 * This function should be called by a cron job every 5-10 minutes.
 * It finds meetings starting in 25-35 minutes and sends reminders.
 */
export async function processReminders() {
  const now = new Date();
  const thirtyMinsLater = new Date(now.getTime() + 30 * 60 * 1000);
  const buffer = 5 * 60 * 1000; // 5 minute buffer

  const upcomingBookings = await prisma.booking.findMany({
    where: {
      status: "CONFIRMED",
      providerSlot: {
        startTime: {
          gte: new Date(thirtyMinsLater.getTime() - buffer),
          lte: new Date(thirtyMinsLater.getTime() + buffer),
        },
      }
    },
    include: {
      customer: true,
      service: true,
      providerSlot: true,
      virtualMeeting: true,
    }
  });

  for (const booking of upcomingBookings) {
    try {
      await sendBookingReminder(
        booking.customer.email,
        booking.customer.name,
        booking.service.title,
        booking.providerSlot.startTime,
        booking.selectedMode,
        booking.venueSnapshot,
        booking.virtualMeeting?.meetingLink
      );
      // We could mark it as "REMINDER_SENT" if we had a field for it
      console.log(`Reminder sent for booking ${booking.id}`);
    } catch (error) {
      console.error(`Failed to send reminder for booking ${booking.id}:`, error);
    }
  }
}
