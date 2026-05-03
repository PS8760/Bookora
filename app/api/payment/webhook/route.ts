import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import prisma from "@/prisma/prisma";
import Stripe from "stripe";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * POST /api/payment/webhook
 * Stripe webhook handler to manage payment lifecycle and booking confirmation.
 *
 * IMPORTANT — gatewayRef race condition fix:
 * The Payment record is created BEFORE the Stripe PaymentIntent is created.
 * gatewayRef is written to the DB only AFTER intent creation succeeds in
 * /api/bookings POST. A fast webhook can arrive BEFORE that update lands,
 * making a `where: { gatewayRef: intent.id }` lookup fail with P2025.
 *
 * Fix: the intent is created with metadata.paymentId which is set atomically
 * at booking creation time. We look up by paymentId and set gatewayRef here
 * if it hasn't been set yet (idempotent upsert pattern).
 */
export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { success: false, error: { code: "MISSING_SIGNATURE", message: "Missing stripe-signature" } },
      { status: 400 }
    );
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not configured");
    return NextResponse.json(
      { success: false, error: { code: "CONFIG_ERROR", message: "Webhook secret not configured" } },
      { status: 500 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`Webhook signature verification failed: ${message}`);
    return NextResponse.json(
      { success: false, error: { code: "INVALID_SIGNATURE", message } },
      { status: 400 }
    );
  }

  try {
    const data = event.data.object as Stripe.PaymentIntent | Stripe.Charge;
    const eventType = event.type;

    switch (eventType) {
      case "payment_intent.succeeded": {
        const intent = data as Stripe.PaymentIntent;

        // Primary lookup: use paymentId from metadata (set at booking creation — no race)
        const paymentId = intent.metadata?.paymentId;
        const bookingId = intent.metadata?.bookingId;

        if (!paymentId || !bookingId) {
          console.error("payment_intent.succeeded: missing paymentId or bookingId in metadata", intent.id);
          break;
        }

        // Idempotency: skip if already processed
        const existingPayment = await prisma.payment.findUnique({ where: { id: paymentId } });
        if (!existingPayment) {
          console.error(`payment_intent.succeeded: Payment ${paymentId} not found in DB`);
          break;
        }
        if (existingPayment.status === "PAID") {
          console.log(`Payment ${paymentId} already processed — skipping.`);
          break;
        }

        await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
          // 1. Mark payment as paid and ensure gatewayRef is set
          await tx.payment.update({
            where: { id: paymentId },
            data: {
              status: "PAID",
              paidAt: new Date(),
              gatewayRef: intent.id, // idempotently set — no-op if already set
            },
          });

          // 2. Fetch booking + service to decide final status
          const booking = await tx.booking.findUnique({
            where: { id: bookingId },
            include: { service: true },
          });

          if (!booking) throw new Error(`Booking ${bookingId} not found`);
          if (booking.paymentStatus === "PAID") return; // already done

          // 3. Update booking status
          await tx.booking.update({
            where: { id: bookingId },
            data: {
              paymentStatus: "PAID",
              // Only auto-confirm if manualConfirm is off
              ...(booking.service.manualConfirm === false
                ? { status: "CONFIRMED", confirmedAt: new Date() }
                : {}),
            },
          });
        });

        console.log(`✓ payment_intent.succeeded processed — booking ${bookingId}, payment ${paymentId}`);
        break;
      }

      case "payment_intent.payment_failed": {
        const intent = data as Stripe.PaymentIntent;
        const paymentId = intent.metadata?.paymentId;

        if (!paymentId) {
          console.error("payment_intent.payment_failed: no paymentId in metadata", intent.id);
          break;
        }

        // Gracefully handle if payment not found (e.g., failed before DB write)
        await prisma.payment.updateMany({
          where: { id: paymentId, status: { not: "PAID" } },
          data: {
            status: "FAILED",
            gatewayRef: intent.id,
            failureReason: intent.last_payment_error?.message ?? "Unknown error",
          },
        });

        console.log(`✗ payment_intent.payment_failed — paymentId ${paymentId}: ${intent.last_payment_error?.message}`);
        break;
      }

      case "charge.refunded": {
        const charge = data as Stripe.Charge;
        const intentId = charge.payment_intent as string;
        if (!intentId) break;

        // Here gatewayRef IS reliable because the refund happens long after
        // payment succeeded (and gatewayRef was already stored)
        await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
          const payment = await tx.payment.findFirst({ where: { gatewayRef: intentId } });
          if (!payment) {
            console.error(`charge.refunded: no Payment found for intent ${intentId}`);
            return;
          }

          await tx.payment.update({
            where: { id: payment.id },
            data: { status: "REFUNDED", refundedAt: new Date() },
          });

          await tx.booking.update({
            where: { id: payment.bookingId },
            data: { paymentStatus: "REFUNDED" },
          });
        });

        console.log(`↩ charge.refunded processed for intent ${intentId}`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${eventType}`);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Webhook processing error:", error);
    // Return 400 so Stripe retries the webhook
    return NextResponse.json(
      { success: false, error: { code: "PROCESSING_ERROR", message } },
      { status: 400 }
    );
  }
}
