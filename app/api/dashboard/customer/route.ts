import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/prisma/prisma";

export const dynamic = "force-dynamic";

// GET /api/dashboard/customer — real stats + bookings for the logged-in customer
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
    }

    const userId = session.user.id;

    const [total, upcoming, completed, cancelled, recentBookings] = await Promise.all([
      prisma.booking.count({ where: { customerId: userId } }),
      prisma.booking.count({
        where: {
          customerId: userId,
          status: { in: ["PENDING", "CONFIRMED"] },
          providerSlot: { startTime: { gte: new Date() } },
        },
      }),
      prisma.booking.count({ where: { customerId: userId, status: "COMPLETED" } }),
      prisma.booking.count({ where: { customerId: userId, status: "CANCELLED" } }),
      prisma.booking.findMany({
        where: { customerId: userId },
        include: {
          service: { select: { id: true, title: true, icon: true, category: true } },
          providerSlot: { select: { startTime: true, endTime: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);

    const now = new Date();
    const upcomingBookings = recentBookings.filter(
      (b) =>
        ["PENDING", "CONFIRMED"].includes(b.status) &&
        b.providerSlot.startTime >= now
    );
    const pastBookings = recentBookings.filter(
      (b) =>
        !["PENDING", "CONFIRMED"].includes(b.status) ||
        b.providerSlot.startTime < now
    );

    return NextResponse.json({
      data: {
        stats: { total, upcoming, completed, cancelled },
        upcomingBookings: upcomingBookings.map(formatBooking),
        pastBookings: pastBookings.map(formatBooking),
        user: {
          name: session.user.name,
          email: session.user.email,
          image: session.user.image,
        },
      },
    });
  } catch (err) {
    console.error("GET /api/dashboard/customer error:", err);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR" } }, { status: 500 });
  }
}

function formatBooking(b: any) {
  return {
    id: b.id,
    service: b.service?.title ?? "Unknown Service",
    icon: b.service?.icon ?? "📅",
    category: b.service?.category ?? "",
    date: b.providerSlot?.startTime
      ? new Date(b.providerSlot.startTime).toLocaleDateString("en-IN", {
          day: "numeric", month: "short", year: "numeric",
        })
      : "—",
    rawDate: b.providerSlot?.startTime ?? null,
    time: b.providerSlot?.startTime
      ? new Date(b.providerSlot.startTime).toLocaleTimeString("en-IN", {
          hour: "2-digit", minute: "2-digit",
        })
      : "—",
    status: b.status.toLowerCase(),
    paymentStatus: b.paymentStatus.toLowerCase(),
    serviceId: b.serviceId,
  };
}
