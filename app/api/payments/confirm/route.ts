import { NextRequest, NextResponse } from "next/server";
import prisma from "@/prisma/prisma";
import { notifyBookingConfirmed } from "@/lib/notification-triggers";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

// POST /api/payments/confirm - Confirm Razorpay payment after gateway callback/webhook.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const paymentId = body.paymentId ?? new URL(request.url).searchParams.get("paymentId");
    const gatewayRef = body.gatewayRef ?? body.razorpay_payment_id ?? null;

    if (!paymentId) {
      return NextResponse.json(
        { error: { code: "INVALID_INPUT", message: "paymentId is required" } },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const payment = await tx.payment.findUnique({
        where: { id: paymentId },
        include: {
          booking: {
            include: {
              service: true,
              customer: { select: { id: true, name: true, email: true } },
            },
          },
        },
      });

      if (!payment) throw new Error("PAYMENT_NOT_FOUND");
      if (payment.status === "PAID") return payment.booking;
      if (payment.booking.status === "CANCELLED") throw new Error("BOOKING_CANCELLED");

      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: "PAID",
          gatewayRef: gatewayRef ?? payment.gatewayRef,
          paidAt: new Date(),
        },
      });

      return tx.booking.update({
        where: { id: payment.bookingId },
        data: {
          paymentStatus: "PAID",
          status: "CONFIRMED",
          confirmedAt: new Date(),
          auditLogs: {
            create: {
              actorId: payment.booking.customerId,
              action: "PAYMENT_RECEIVED",
              metadata: { paymentId: payment.id, gatewayRef },
            },
          },
          notifications: {
            create: [
              {
                userId: payment.booking.customerId,
                channel: "EMAIL",
                subject: "Payment received",
                body: `Payment for ${payment.booking.service.title} was received and your booking is confirmed.`,
              },
              {
                userId: payment.booking.service.organiserId,
                channel: "EMAIL",
                subject: "Payment received",
                body: `A payment was received for ${payment.booking.service.title}.`,
              },
            ],
          },
        },
        include: {
          providerSlot: true,
          service: true,
          customer: { select: { id: true, name: true, email: true } },
          payments: true,
        },
      });
    });

    // Generate push notification after final booking is done (payment confirmed)
    if (result && result.id) {
      notifyBookingConfirmed(result.id).catch((e) =>
        console.error("notifyBookingConfirmed failed on payment:", e)
      );
    }

    return NextResponse.json({ data: result, message: "Payment confirmed successfully" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "INTERNAL_ERROR";
    console.error("POST /api/payments/confirm error:", error);

    if (message === "PAYMENT_NOT_FOUND") {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Payment not found" } },
        { status: 404 }
      );
    }
    if (message === "BOOKING_CANCELLED") {
      return NextResponse.json(
        { error: { code: "INVALID_STATE", message: "Booking is already cancelled" } },
        { status: 422 }
      );
    }

    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to confirm payment" } },
      { status: 500 }
    );
  }
}
