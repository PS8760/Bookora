import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import prisma from "@/prisma/prisma";
import Stripe from "stripe";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * POST /api/payment/webhook
 * Stripe webhook handler to manage payment lifecycle and booking confirmation.
 */
export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ success: false, error: { code: "MISSING_SIGNATURE", message: "Missing stripe-signature" } }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not configured");
    return NextResponse.json({ success: false, error: { code: "CONFIG_ERROR", message: "Webhook secret not configured" } }, { status: 500 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return NextResponse.json({ success: false, error: { code: "INVALID_SIGNATURE", message: err.message } }, { status: 400 });
  }

  try {
    const data = event.data.object as any;
    const eventType = event.type;

    // Handle the event
    switch (eventType) {
      case "payment_intent.succeeded": {
        const intent = data as Stripe.PaymentIntent;
        const bookingId = intent.metadata.bookingId;

        if (!bookingId) {
          console.error("No bookingId in payment intent metadata");
          break;
        }

        // Idempotency check: Check if payment is already processed
        const existingPayment = await prisma.payment.findFirst({
          where: { gatewayRef: intent.id },
        });

        if (existingPayment?.status === "PAID") {
          console.log(`Payment intent ${intent.id} already processed.`);
          return NextResponse.json({ received: true });
        }

        await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
          // 1. Update Payment record
          await tx.payment.update({
            where: { gatewayRef: intent.id },
            data: {
              status: "PAID",
              paidAt: new Date(),
            },
          });

          // 2. Fetch service details to check manual confirmation requirement
          const booking = await tx.booking.findUnique({
            where: { id: bookingId },
            include: { service: true },
          });

          if (!booking) throw new Error(`Booking ${bookingId} not found`);

          // 3. Update Booking record
          await tx.booking.update({
            where: { id: bookingId },
            data: {
              paymentStatus: "PAID",
              // Only confirm automatically if manualConfirm is false
              ...(booking.service.manualConfirm === false ? { status: "CONFIRMED", confirmedAt: new Date() } : {}),
            },
          });
        });

        console.log(`Successfully processed successful payment for booking ${bookingId}`);
        break;
      }

      case "payment_intent.payment_failed": {
        const intent = data as Stripe.PaymentIntent;
        await prisma.payment.update({
          where: { gatewayRef: intent.id },
          data: {
            status: "FAILED",
            failureReason: intent.last_payment_error?.message || "Unknown error",
          },
        });
        console.log(`Payment failed for intent ${intent.id}: ${intent.last_payment_error?.message}`);
        break;
      }

      case "charge.refunded": {
        const charge = data as Stripe.Charge;
        const intentId = charge.payment_intent as string;

        if (!intentId) break;

        await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
          const payment = await tx.payment.update({
            where: { gatewayRef: intentId },
            data: {
              status: "REFUNDED",
              refundedAt: new Date(),
            },
          });

          await tx.booking.update({
            where: { id: payment.bookingId },
            data: {
              paymentStatus: "REFUNDED",
            },
          });
        });
        console.log(`Processed refund for intent ${intentId}`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${eventType}`);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error: any) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      { success: false, error: { code: "PROCESSING_ERROR", message: error.message } },
      { status: 400 } // Return 400 to let Stripe retry
    );
  }
}
