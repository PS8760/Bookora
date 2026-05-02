import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/prisma/prisma";
export const dynamic = "force-dynamic";

type SessionUser = { id: string; role?: string };

// GET /api/bookings/me - Get customer's own bookings
export async function GET(request: NextRequest) {
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
        { error: { code: "FORBIDDEN", message: "Customers only" } },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where: { customerId: user.id },
        include: {
          providerSlot: true,
          service: { include: { organiser: { select: { id: true, name: true, email: true } } } },
          provider: { select: { id: true, name: true, email: true, image: true } },
          resource: true,
          payments: { orderBy: { createdAt: "desc" }, take: 1 },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.booking.count({ where: { customerId: user.id } }),
    ]);

    return NextResponse.json({
      data: bookings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching bookings:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch bookings" } },
      { status: 500 }
    );
  } finally {
    // prisma.$disconnect() is not needed with shared client
  }
}
