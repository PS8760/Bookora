import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/prisma/prisma";

export const dynamic = "force-dynamic";

type SessionUser = { id: string; role?: string };

// POST /api/bookings/:id/confirm - Confirm a pending manual-confirm booking.
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
    const result = await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id },
        include: { service: true, customer: { select: { id: true, name: true } } },
      });

      if (!booking) throw new Error("BOOKING_NOT_FOUND");
      if (role === "organiser" && booking.service.organiserId !== user.id) {
        throw new Error("FORBIDDEN");
      }
      if (booking.status !== "PENDING") throw new Error("INVALID_STATE_TRANSITION");

      return tx.booking.update({
        where: { id },
        data: {
          status: "CONFIRMED",
          confirmedAt: new Date(),
          auditLogs: {
            create: {
              actorId: user.id,
              action: "CONFIRMED",
              metadata: { previousStatus: "PENDING", newStatus: "CONFIRMED" },
              ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
              userAgent: request.headers.get("user-agent") ?? undefined,
            },
          },
          notifications: {
            create: {
              userId: booking.customerId,
              channel: "EMAIL",
              subject: "Booking confirmed",
              body: `Your booking for ${booking.service.title} has been confirmed.`,
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

    return NextResponse.json({ data: result, message: "Booking confirmed successfully" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "INTERNAL_ERROR";
    console.error("POST /api/bookings/:id/confirm error:", error);

    if (message === "BOOKING_NOT_FOUND") {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Booking not found" } },
        { status: 404 }
      );
    }
    if (message === "FORBIDDEN") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "You do not have permission to confirm this booking" } },
        { status: 403 }
      );
    }
    if (message === "INVALID_STATE_TRANSITION") {
      return NextResponse.json(
        { error: { code: "INVALID_STATE_TRANSITION", message: "Only pending bookings can be confirmed" } },
        { status: 422 }
      );
    }

    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to confirm booking" } },
      { status: 500 }
    );
  }
}
