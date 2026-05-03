import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/prisma/prisma";
import { createRefund } from "@/lib/stripe";
import { sendNotification, NotificationTemplates } from "@/lib/notifications";

export const dynamic = "force-dynamic";

// POST /api/payments/[id]/refund — Refund a payment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { amount, reason } = body;

    // Fetch payment
    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        booking: {
          include: {
            customer: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            service: {
              select: {
                id: true,
                title: true,
                organiserId: true,
              },
            },
          },
        },
      },
    });

    if (!payment) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Payment not found" } },
        { status: 404 }
      );
    }

    // Check authorization (only organiser or admin can refund)
    const isOrganiser = payment.booking.service.organiserId === session.user.id;
    const isAdmin = (session.user as any).role === "admin";

    if (!isOrganiser && !isAdmin) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Not authorized to refund this payment" } },
        { status: 403 }
      );
    }

    // Check if payment is paid
    if (payment.status !== "PAID") {
      return NextResponse.json(
        { error: { code: "INVALID_REQUEST", message: "Only paid payments can be refunded" } },
        { status: 400 }
      );
    }

    // Check if already refunded
    if (payment.status === "REFUNDED") {
      return NextResponse.json(
        { error: { code: "ALREADY_REFUNDED", message: "This payment has already been refunded" } },
        { status: 400 }
      );
    }

    if (!payment.gatewayRef) {
      return NextResponse.json(
        { error: { code: "INVALID_REQUEST", message: "No payment reference found" } },
        { status: 400 }
      );
    }

    // Create refund in Stripe
    const refundAmount = amount ? Number(amount) : undefined;
    const refund = await createRefund(
      payment.gatewayRef,
      refundAmount,
      reason || "requested_by_customer"
    );

    // Update payment status
    await prisma.payment.update({
      where: { id },
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

    // Send notification to customer
    const template = NotificationTemplates.PAYMENT_REFUNDED(
      payment.booking.customer.name,
      refundAmount || Number(payment.amount),
      payment.currency,
      payment.booking.service.title
    );

    await sendNotification({
      userId: payment.booking.customerId,
      bookingId: payment.bookingId,
      ...template,
    });

    return NextResponse.json({
      message: "Refund processed successfully",
      refund: {
        id: refund.id,
        amount: refund.amount / 100,
        status: refund.status,
      },
    });
  } catch (error) {
    console.error("POST /api/payments/[id]/refund error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to process refund" } },
      { status: 500 }
    );
  }
}
