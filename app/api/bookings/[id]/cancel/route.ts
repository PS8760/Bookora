import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/prisma/prisma";
import { invalidateSlotCacheForSlot } from "@/lib/slot-cache";

export const dynamic = "force-dynamic";

type SessionUser = { id: string; role?: string };

// POST /api/bookings/:id/cancel — cancel a booking (customer cancels own, admin cancels any)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { reason } = body;
    const user = session.user as SessionUser;
    const role = user.role ?? "customer";

    const result = await prisma.$transaction(async (tx) => {
      // Lock the booking row
      const bookings = await tx.$queryRaw<any[]>`
        SELECT b.*, ps."serviceId", ps.id as "slotId", ps."startTime" as "slotStartTime"
        FROM bookings b
        JOIN provider_slots ps ON b."providerSlotId" = ps.id
        WHERE b.id = ${id}::uuid
        FOR UPDATE
      `;

      if (!bookings || bookings.length === 0) throw new Error("NOT_FOUND");
      const booking = bookings[0];

      // Permission check
      if (role === "customer" && booking.customerId !== user.id) {
        throw new Error("FORBIDDEN");
      }
      if (role === "organiser") {
        // Organiser can cancel bookings on their own services
        const svc = await tx.service.findFirst({
          where: { id: booking.serviceId, organiserId: user.id },
          select: { id: true },
        });
        if (!svc) throw new Error("FORBIDDEN");
      }

      const cancellableStatuses = ["PENDING", "CONFIRMED"];
      if (!cancellableStatuses.includes(booking.status)) {
        throw new Error("INVALID_STATE");
      }

      let capacityBooked = 1;
      try {
        const notes = booking.notes ? JSON.parse(booking.notes) : null;
        capacityBooked = Math.max(Number(notes?.capacityRequested ?? 1), 1);
      } catch {
        capacityBooked = 1;
      }

      // Restore slot capacity
      await tx.$executeRaw`
        UPDATE provider_slots
        SET booked = GREATEST(0, booked - ${capacityBooked})
        WHERE id = ${booking.slotId}::uuid
      `;

      const updated = await tx.booking.update({
        where: { id },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
          notes: JSON.stringify({ previousNotes: booking.notes ?? null, cancellationReason: reason ?? null }),
        },
        select: { id: true, status: true, cancelledAt: true },
      });

      return { ...updated, serviceId: booking.serviceId, slotStartTime: booking.slotStartTime };
    });

    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        bookingId: id,
        action: "CANCELLED",
        metadata: { reason: reason ?? null },
        ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
        userAgent: request.headers.get("user-agent") ?? undefined,
      },
    });

    // Invalidate slot cache so next poll reflects restored capacity immediately
    if (result.serviceId && result.slotStartTime) {
      invalidateSlotCacheForSlot(result.serviceId, new Date(result.slotStartTime));
    }

    return NextResponse.json({ data: result, message: "Booking cancelled" });
  } catch (err: any) {
    console.error("POST /api/bookings/:id/cancel error:", err);
    if (err.message === "NOT_FOUND")
      return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 });
    if (err.message === "FORBIDDEN")
      return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
    if (err.message === "INVALID_STATE")
      return NextResponse.json(
        { error: { code: "INVALID_STATE", message: "Booking cannot be cancelled in its current state" } },
        { status: 422 }
      );
    return NextResponse.json({ error: { code: "INTERNAL_ERROR" } }, { status: 500 });
  }
}
