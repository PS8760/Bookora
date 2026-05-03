import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/prisma/prisma";

export const dynamic = "force-dynamic";

type SessionUser = { id: string; role?: string };

/**
 * GET /api/bookings/:id
 * Returns a single booking. Used by the payment status page to poll the DB
 * and confirm the webhook has updated the booking to PAID/CONFIRMED.
 *
 * Auth rules:
 *  - Customer: can only read their own booking
 *  - Organiser: can read bookings on their services
 *  - Admin: can read any booking
 */
export async function GET(
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
    const user = session.user as SessionUser;
    const role = user.role ?? "customer";

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        service: { select: { id: true, title: true, organiserId: true, manualConfirm: true } },
        providerSlot: { select: { startTime: true, endTime: true } },
        payments: { orderBy: { createdAt: "desc" }, take: 1 },
        customer: { select: { id: true, name: true, email: true } },
      },
    });

    if (!booking) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Booking not found" } },
        { status: 404 }
      );
    }

    // ── Access control ─────────────────────────────────────────────────────
    if (role === "customer" && booking.customerId !== user.id) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Access denied" } },
        { status: 403 }
      );
    }

    if (role === "organiser" && booking.service.organiserId !== user.id) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Access denied" } },
        { status: 403 }
      );
    }

    return NextResponse.json({ data: booking });
  } catch (error) {
    console.error("GET /api/bookings/:id error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch booking" } },
      { status: 500 }
    );
  }
}
