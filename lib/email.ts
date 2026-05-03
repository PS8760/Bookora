import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT || "587"),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export async function sendBookingConfirmationEmail({
  to,
  customerName,
  serviceName,
  startTime,
  bookingId,
}: {
  to: string;
  customerName: string;
  serviceName: string;
  startTime: Date;
  bookingId: string;
}) {
  const dateString = new Intl.DateTimeFormat("en-GB", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(startTime);

  const mailOptions = {
    from: `"Bookora" <${process.env.EMAIL_FROM}>`,
    to,
    subject: `Booking Confirmed: ${serviceName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #333;">Booking Confirmation</h2>
        <p>Hi ${customerName},</p>
        <p>Your booking for <strong>${serviceName}</strong> has been successfully confirmed.</p>
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Date & Time:</strong> ${dateString}</p>
          <p style="margin: 5px 0 0 0;"><strong>Booking ID:</strong> ${bookingId}</p>
        </div>
        <p>You can view your booking details or reschedule in your dashboard.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #777;">Thank you for using Bookora!</p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent: %s", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error sending booking confirmation email:", error);
    return { success: false, error };
  }
}
