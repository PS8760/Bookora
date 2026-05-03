import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/prisma/prisma";

export const dynamic = "force-dynamic";

// GET /api/payments/[id] — Get payment details
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
            providerSlot: {
              select: {
                startTime: true,
                endTime: true,
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

    // Check authorization
    const isCustomer = payment.booking.customerId === session.user.id;
    const isOrganiser = payment.booking.service.organiserId === session.user.id;
    const isAdmin = (session.user as any).role === "admin";

    if (!isCustomer && !isOrganiser && !isAdmin) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Not authorized to view this payment" } },
        { status: 403 }
      );
    }

    return NextResponse.json({ data: payment });
  } catch (error) {
    console.error("GET /api/payments/[id] error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch payment" } },
      { status: 500 }
    );
  }
}
