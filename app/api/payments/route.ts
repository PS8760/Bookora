import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/prisma/prisma";

export const dynamic = "force-dynamic";

type SessionUser = { id: string; role?: string };

// GET /api/payments - Payment ledger for current user/organiser/admin.
export async function GET(request: NextRequest) {
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
    const { searchParams } = new URL(request.url);
    const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "20", 10), 1), 100);
    const skip = (page - 1) * limit;

    const where = {
      booking: role === "admin"
        ? {}
        : role === "organiser"
        ? { service: { organiserId: user.id } }
        : { customerId: user.id },
    };

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          booking: {
            include: {
              service: { select: { id: true, title: true, organiserId: true } },
              customer: { select: { id: true, name: true, email: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.payment.count({ where }),
    ]);

    return NextResponse.json({
      data: payments,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("GET /api/payments error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch payments" } },
      { status: 500 }
    );
  }
}

// POST /api/payments - Create/get a Razorpay checkout descriptor for a pending payment.
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      );
    }

    const user = session.user as SessionUser;
    if ((user.role ?? "customer") !== "customer") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Only customers can create payments" } },
        { status: 403 }
      );
    }

    const { bookingId } = await request.json();
    if (!bookingId) {
      return NextResponse.json(
        { error: { code: "INVALID_INPUT", message: "bookingId is required" } },
        { status: 400 }
      );
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        service: true,
        payments: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });

    if (!booking) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Booking not found" } },
        { status: 404 }
      );
    }

    if (booking.customerId !== user.id) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Access denied" } },
        { status: 403 }
      );
    }

    if (!booking.service.advancePayment || booking.paymentStatus !== "PENDING") {
      return NextResponse.json(
        { error: { code: "INVALID_STATE", message: "Booking is not pending payment" } },
        { status: 422 }
      );
    }

    const payment = booking.payments[0] ?? await prisma.payment.create({
      data: {
        bookingId: booking.id,
        amount: booking.service.paymentAmount ?? 0,
        currency: booking.service.currency,
        status: "PENDING",
        gatewayProvider: "razorpay",
        idempotencyKey: `${booking.id}:razorpay`,
      },
    });

    return NextResponse.json({
      data: {
        bookingId: booking.id,
        paymentId: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        provider: "razorpay",
        razorpayAccountMode: "organiser-direct",
        checkoutUrl: `/api/payments/confirm?paymentId=${payment.id}`,
      },
    });
  } catch (error) {
    console.error("POST /api/payments error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to create payment" } },
      { status: 500 }
    );
  }
}
