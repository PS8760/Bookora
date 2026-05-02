import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/prisma/prisma";

export const dynamic = "force-dynamic";

// GET /api/admin/reports/overview — overview stats (admin only)
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      );
    }

    if ((session.user as { role?: string }).role !== "admin") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Admin access required" } },
        { status: 403 }
      );
    }

    const [totalServices, bookingsByStatus, recentBookings] = await Promise.all([
      prisma.service.count({ where: { deletedAt: null } }),

      // Bookings grouped by status
      prisma.booking.groupBy({
        by: ["status"],
        _count: { id: true },
      }),

      // Last 30 days booking trend
      prisma.$queryRaw<Array<{ day: string; count: bigint }>>`
        SELECT DATE_TRUNC('day', "createdAt")::date::text AS day, COUNT(*) AS count
        FROM bookings
        WHERE "createdAt" >= NOW() - INTERVAL '30 days'
        GROUP BY DATE_TRUNC('day', "createdAt")
        ORDER BY day ASC
      `,
    ]);

    return NextResponse.json({
      data: {
        totalServices,
        bookingsByStatus: bookingsByStatus.map((b) => ({
          status: b.status,
          count: b._count.id,
        })),
        bookingTrend: recentBookings.map((r) => ({
          day: r.day,
          count: Number(r.count),
        })),
      },
      timestamp_utc: new Date().toISOString(),
    });
  } catch (error) {
    console.error("GET /api/admin/reports/overview error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to generate overview report" } },
      { status: 500 }
    );
  }
}
