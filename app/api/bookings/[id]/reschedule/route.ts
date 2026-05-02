import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/prisma/prisma";

export const dynamic = "force-dynamic";

type SessionUser = {
  id: string;
  role?: string;
};

// POST /api/bookings/:id/reschedule - Atomic reschedule flow
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      );
    }

    const user = session.user as SessionUser;
    const role = user.role ?? "customer";
    if (role !== "customer") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Only customers can reschedule bookings" } },
        { status: 403 }
      );
    }

    const { id: bookingId } = await params;
    const body = await request.json();
    const { newSlotId, reason } = body;

    if (!newSlotId) {
      return NextResponse.json(
        { error: { code: "INVALID_INPUT", message: "newSlotId is required" } },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        include: {
          service: true,
          providerSlot: true,
        },
      });

      if (!booking) {
        throw new Error("BOOKING_NOT_FOUND");
      }

      // Verify ownership
      if (booking.customerId !== user.id) {
        throw new Error("FORBIDDEN");
      }

      if (!["PENDING", "CONFIRMED"].includes(booking.status)) {
        throw new Error("INVALID_STATUS");
      }

      const newSlot = await tx.providerSlot.findFirst({
        where: {
          id: newSlotId,
          serviceId: booking.serviceId,
          isActive: true,
        },
      });

      if (!newSlot) {
        throw new Error("NEW_SLOT_NOT_FOUND");
      }

      if (new Date(newSlot.startTime) <= new Date()) {
        throw new Error("NEW_SLOT_PAST");
      }

      const parsedNotes = booking.notes ? JSON.parse(booking.notes) : {};
      const capacityRequested = Math.max(Number(parsedNotes?.capacityRequested ?? 1), 1);

      if (newSlot.booked + capacityRequested > newSlot.capacity) {
        throw new Error("NEW_SLOT_CAPACITY_EXCEEDED");
      }

      const newSlotUpdate = await tx.providerSlot.updateMany({
        where: {
          id: newSlotId,
          isActive: true,
          booked: { lte: newSlot.capacity - capacityRequested },
        },
        data: {
          booked: { increment: capacityRequested },
          version: { increment: 1 },
        },
      });
      if (newSlotUpdate.count !== 1) {
        throw new Error("NEW_SLOT_CAPACITY_EXCEEDED");
      }

      await tx.providerSlot.updateMany({
        where: {
          id: booking.providerSlotId,
          booked: { gte: capacityRequested },
        },
        data: {
          booked: { decrement: capacityRequested },
          version: { increment: 1 },
        },
      });

      const nextStatus = booking.service.manualConfirm ? "PENDING" : "CONFIRMED";

      const updatedBooking = await tx.booking.update({
        where: { id: bookingId },
        data: {
          providerSlotId: newSlotId,
          status: nextStatus,
          paymentStatus: booking.service.advancePayment ? "PENDING" : booking.paymentStatus,
          confirmedAt: nextStatus === "CONFIRMED" ? new Date() : null,
          notes: JSON.stringify({
            ...parsedNotes,
            rescheduledAt: new Date().toISOString(),
            rescheduleReason: reason ?? null,
          }),
          reschedules: {
            create: {
              fromSlotId: booking.providerSlotId,
              toSlotId: newSlotId,
              rescheduledById: user.id,
              reason: reason ?? null,
            },
          },
          auditLogs: {
            create: {
              actorId: user.id,
              action: "RESCHEDULED",
              metadata: {
                fromSlotId: booking.providerSlotId,
                toSlotId: newSlotId,
                reason: reason ?? null,
              },
              ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
              userAgent: request.headers.get("user-agent") ?? undefined,
            },
          },
        },
        include: {
          providerSlot: true,
          service: true,
          customer: { select: { id: true, name: true, email: true } },
        },
      });

      return updatedBooking;
    });

    return NextResponse.json(
      { data: result, message: "Booking rescheduled successfully" },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error rescheduling booking:", error);

    if (error.message === "BOOKING_NOT_FOUND") {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Booking not found" } },
        { status: 404 }
      );
    }

    if (error.message === "FORBIDDEN") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Access denied" } },
        { status: 403 }
      );
    }

    if (error.message === "INVALID_STATUS") {
      return NextResponse.json(
        { error: { code: "INVALID_STATE", message: "Only pending or confirmed bookings can be rescheduled" } },
        { status: 409 }
      );
    }

    if (error.message === "NEW_SLOT_NOT_FOUND") {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "New slot not found" } },
        { status: 404 }
      );
    }

    if (error.message === "NEW_SLOT_PAST") {
      return NextResponse.json(
        { error: { code: "SLOT_PAST", message: "Cannot reschedule to a past slot" } },
        { status: 409 }
      );
    }

    if (error.message === "NEW_SLOT_CAPACITY_EXCEEDED") {
      return NextResponse.json(
        { error: { code: "CAPACITY_EXCEEDED", message: "New slot capacity exceeded" } },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to reschedule booking" } },
      { status: 500 }
    );
  }
}
