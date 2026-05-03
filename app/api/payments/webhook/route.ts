import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import prisma from "@/prisma/prisma";
import { constructWebhookEvent, getPaymentStatus } from "@/lib/stripe";
import { sendNotification, NotificationTemplates } from "@/lib/notifications";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

// POST /api/payments/webhook — Handle Stripe webhook events
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get("stripe-signature");

    if (!signature) {
      console.error("No Stripe signature found");
      return NextResponse.json(
        { error: "No signature" },
        { status: 400 }
      );
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("STRIPE_WEBHOOK_SECRET not configured");
      return NextResponse.json(
        { error: "Webhook secret not configured" },
        { status: 500 }
      );
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = constructWebhookEvent(body, signature, webhookSecret);
    } catch (error) {
      console.error("Webhook signature verification failed:", error);
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 }
      );
    }

    console.log(`Received Stripe webhook: ${event.type}`);

    // Handle different event types
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case "payment_intent.succeeded":
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      case "payment_intent.payment_failed":
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      case "charge.refunded":
        await handleChargeRefunded(event.data.object as Stripe.Charge);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}

// ─── Event Handlers ───────────────────────────────────────────────────────────

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  try {
    const bookingId = session.client_reference_id || session.metadata?.bookingId;

    if (!bookingId) {
      console.error("No booking ID in checkout session");
      return;
    }

    // Find payment record
    const payment = await prisma.payment.findFirst({
      where: {
        bookingId,
        gatewayRef: session.id,
      },
      include: {
        booking: {
          include: {
            customer: true,
            service: {
              select: {
                title: true,
                organiserId: true,
              },
            },
            providerSlot: {
              select: {
                startTime: true,
              },
            },
          },
        },
      },
    });

    if (!payment) {
      console.error(`Payment not found for booking ${bookingId}`);
      return;
    }

    // Update payment status
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "PAID",
        paidAt: new Date(),
      },
    });

    // Update booking payment status
    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        paymentStatus: "PAID",
      },
    });

    // Send notification to customer
    const template = NotificationTemplates.PAYMENT_RECEIVED(
      payment.booking.customer.name,
      Number(payment.amount),
      payment.currency,
      payment.booking.service.title
    );

    await sendNotification({
      userId: payment.booking.customerId,
      bookingId,
      ...template,
    });

    // Send notification to organiser
    const organiser = await prisma.user.findUnique({
      where: { id: payment.booking.service.organiserId },
      select: { name: true },
    });

    if (organiser) {
      await sendNotification({
        userId: payment.booking.service.organiserId,
        bookingId,
        subject: "Payment Received",
        body: `Payment of ${payment.currency} ${payment.amount} received for booking by ${payment.booking.customer.name}`,
      });
    }

    console.log(`Payment completed for booking ${bookingId}`);
  } catch (error) {
    console.error("Error handling checkout.session.completed:", error);
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  try {
    const bookingId = paymentIntent.metadata?.bookingId;

    if (!bookingId) {
      console.log("No booking ID in payment intent metadata");
      return;
    }

    // Update payment record
    await prisma.payment.updateMany({
      where: {
        bookingId,
        gatewayRef: paymentIntent.id,
      },
      data: {
        status: "PAID",
        paidAt: new Date(),
      },
    });

    console.log(`Payment intent succeeded for booking ${bookingId}`);
  } catch (error) {
    console.error("Error handling payment_intent.succeeded:", error);
  }
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  try {
    const bookingId = paymentIntent.metadata?.bookingId;

    if (!bookingId) {
      console.log("No booking ID in payment intent metadata");
      return;
    }

    // Update payment record
    await prisma.payment.updateMany({
      where: {
        bookingId,
        gatewayRef: paymentIntent.id,
      },
      data: {
        status: "FAILED",
        failureReason: paymentIntent.last_payment_error?.message || "Payment failed",
      },
    });

    // Update booking payment status
    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        paymentStatus: "FAILED",
      },
    });

    // Notify customer
    const payment = await prisma.payment.findFirst({
      where: { bookingId },
      include: {
        booking: {
          include: {
            customer: true,
            service: { select: { title: true } },
          },
        },
      },
    });

    if (payment) {
      await sendNotification({
        userId: payment.booking.customerId,
        bookingId,
        subject: "Payment Failed",
        body: `Your payment for "${payment.booking.service.title}" failed. Please try again.`,
      });
    }

    console.log(`Payment intent failed for booking ${bookingId}`);
  } catch (error) {
    console.error("Error handling payment_intent.payment_failed:", error);
  }
}

async function handleChargeRefunded(charge: Stripe.Charge) {
  try {
    const paymentIntentId = charge.payment_intent as string;

    if (!paymentIntentId) {
      console.log("No payment intent ID in charge");
      return;
    }

    // Find payment by gateway ref
    const payment = await prisma.payment.findFirst({
      where: {
        gatewayRef: paymentIntentId,
      },
      include: {
        booking: {
          include: {
            customer: true,
            service: { select: { title: true } },
          },
        },
      },
    });

    if (!payment) {
      console.log(`Payment not found for payment intent ${paymentIntentId}`);
      return;
    }

    // Update payment status
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "REFUNDED",
        refundedAt: new Date(),
      },
    });

    // Update booking payment status
    await prisma.booking.update({
      where: { id: payment.bookingId },
      data: {
        paymentStatus: "REFUNDED",
      },
    });

    // Notify customer
    const template = NotificationTemplates.PAYMENT_REFUNDED(
      payment.booking.customer.name,
      Number(payment.amount),
      payment.currency,
      payment.booking.service.title
    );

    await sendNotification({
      userId: payment.booking.customerId,
      bookingId: payment.bookingId,
      ...template,
    });

    console.log(`Refund processed for booking ${payment.bookingId}`);
  } catch (error) {
    console.error("Error handling charge.refunded:", error);
  }
}
