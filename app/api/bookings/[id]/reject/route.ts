import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/prisma/prisma";
import { notifyBookingCancelled } from "@/lib/notification-triggers";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

type SessionUser = { id: string; role?: string };

// POST /api/bookings/:id/reject - Reject a pending manual-confirm booking.
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

    const user = session.user as SessionUser;
    const role = user.role ?? "customer";
    if (role !== "organiser" && role !== "admin") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Organiser access required" } },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const reason = body.reason ?? null;

    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const booking = await tx.booking.findUnique({
        where: { id },
        include: { service: true, providerSlot: true },
      });

      if (!booking) throw new Error("BOOKING_NOT_FOUND");
      if (role === "organiser" && booking.service.organiserId !== user.id) {
        throw new Error("FORBIDDEN");
      }
      if (booking.status !== "PENDING") throw new Error("INVALID_STATE_TRANSITION");

      let capacityBooked = 1;
      try {
        const notes = booking.notes ? JSON.parse(booking.notes) : null;
        capacityBooked = Math.max(Number(notes?.capacityRequested ?? 1), 1);
      } catch {
        capacityBooked = 1;
      }

      await tx.providerSlot.update({
        where: { id: booking.providerSlotId },
        data: {
          booked: { decrement: Math.min(capacityBooked, booking.providerSlot.booked) },
          version: { increment: 1 },
        },
      });

      return tx.booking.update({
        where: { id },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
          notes: JSON.stringify({ previousNotes: booking.notes ?? null, rejectionReason: reason }),
          auditLogs: {
            create: {
              actorId: user.id,
              action: "CANCELLED",
              metadata: { previousStatus: "PENDING", rejected: true, reason },
              ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
              userAgent: request.headers.get("user-agent") ?? undefined,
            },
          },
          notifications: {
            create: {
              userId: booking.customerId,
              channel: "EMAIL",
              subject: "Booking declined",
              body: `Your booking for ${booking.service.title} was declined.${reason ? ` Reason: ${reason}` : ""}`,
            },
          },
        },
        include: {
          providerSlot: true,
          service: true,
          customer: { select: { id: true, name: true, email: true } },
        },
      });
    }, {
      timeout: 15000
    });

    // Fire PUSH notification to customer (non-fatal)
    notifyBookingCancelled(result.id, reason ?? undefined).catch((e) =>
      console.error("notifyBookingCancelled (reject) failed:", e)
    );

    return NextResponse.json({ data: result, message: "Booking rejected successfully" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "INTERNAL_ERROR";
    console.error("POST /api/bookings/:id/reject error:", error);

    if (message === "BOOKING_NOT_FOUND") {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Booking not found" } },
        { status: 404 }
      );
    }
    if (message === "FORBIDDEN") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "You do not have permission to reject this booking" } },
        { status: 403 }
      );
    }
    if (message === "INVALID_STATE_TRANSITION") {
      return NextResponse.json(
        { error: { code: "INVALID_STATE_TRANSITION", message: "Only pending bookings can be rejected" } },
        { status: 422 }
      );
    }

    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to reject booking" } },
      { status: 500 }
    );
  }
}
