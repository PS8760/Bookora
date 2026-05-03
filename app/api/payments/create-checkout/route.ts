import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/prisma/prisma";
import { createCheckoutSession } from "@/lib/stripe";
import { v4 as uuidv4 } from "uuid";

export const dynamic = "force-dynamic";

// POST /api/payments/create-checkout — Create Stripe checkout session
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { bookingId } = body;

    if (!bookingId) {
      return NextResponse.json(
        { error: { code: "INVALID_INPUT", message: "Booking ID is required" } },
        { status: 400 }
      );
    }

    // Fetch booking details
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        service: {
          select: {
            title: true,
            paymentAmount: true,
            currency: true,
            advancePayment: true,
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Booking not found" } },
        { status: 404 }
      );
    }

    // Verify user is the customer
    if (booking.customerId !== session.user.id) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Not authorized to pay for this booking" } },
        { status: 403 }
      );
    }

    // Check if payment is required
    if (!booking.service.advancePayment || !booking.service.paymentAmount) {
      return NextResponse.json(
        { error: { code: "INVALID_REQUEST", message: "This service does not require payment" } },
        { status: 400 }
      );
    }

    // Check if already paid
    const existingPayment = await prisma.payment.findFirst({
      where: {
        bookingId,
        status: "PAID",
      },
    });

    if (existingPayment) {
      return NextResponse.json(
        { error: { code: "ALREADY_PAID", message: "This booking has already been paid" } },
        { status: 400 }
      );
    }

    const amount = Number(booking.service.paymentAmount);
    const currency = booking.service.currency || "INR";

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        bookingId,
        amount,
        currency,
        status: "PENDING",
        gatewayProvider: "stripe",
        idempotencyKey: uuidv4(),
      },
    });

    // Create Stripe checkout session
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const checkoutSession = await createCheckoutSession({
      bookingId,
      amount,
      currency,
      customerEmail: booking.customer.email,
      customerName: booking.customer.name,
      serviceTitle: booking.service.title,
      successUrl: `${siteUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${siteUrl}/payment/cancel?booking_id=${bookingId}`,
      metadata: {
        paymentId: payment.id,
        customerId: booking.customer.id,
      },
    });

    // Update payment with Stripe session ID
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        gatewayRef: checkoutSession.id,
      },
    });

    return NextResponse.json({
      sessionId: checkoutSession.id,
      sessionUrl: checkoutSession.url,
      paymentId: payment.id,
    });
  } catch (error) {
    console.error("POST /api/payments/create-checkout error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to create checkout session" } },
      { status: 500 }
    );
  }
}
