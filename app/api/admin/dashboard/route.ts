import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/prisma/prisma";

export const dynamic = "force-dynamic";

// GET /api/admin/dashboard — platform-wide stats (admin only)
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

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - 7);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalUsers,
      activeUsers,
      totalOrganisers,
      totalAdmins,
      totalServices,
      publishedServices,
      totalBookings,
      todayBookings,
      weekBookings,
      monthBookings,
      pendingBookings,
      confirmedBookings,
      cancelledBookings,
    ] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.user.count({ where: { deletedAt: null, isActive: true } }),
      prisma.user.count({ where: { deletedAt: null, role: "organiser" } }),
      prisma.user.count({ where: { deletedAt: null, role: "admin" } }),
      prisma.service.count({ where: { deletedAt: null } }),
      prisma.service.count({ where: { deletedAt: null, isPublished: true } }),
      prisma.booking.count(),
      prisma.booking.count({ where: { createdAt: { gte: startOfDay } } }),
      prisma.booking.count({ where: { createdAt: { gte: startOfWeek } } }),
      prisma.booking.count({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.booking.count({ where: { status: "PENDING" } }),
      prisma.booking.count({ where: { status: "CONFIRMED" } }),
      prisma.booking.count({ where: { status: "CANCELLED" } }),
    ]);

    return NextResponse.json({
      data: {
        users: { total: totalUsers, active: activeUsers, organisers: totalOrganisers, admins: totalAdmins },
        services: { total: totalServices, published: publishedServices },
        bookings: {
          total: totalBookings,
          today: todayBookings,
          thisWeek: weekBookings,
          thisMonth: monthBookings,
          pending: pendingBookings,
          confirmed: confirmedBookings,
          cancelled: cancelledBookings,
        },
      },
      timestamp_utc: new Date().toISOString(),
    });
  } catch (error) {
    console.error("GET /api/admin/dashboard error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch dashboard stats" } },
      { status: 500 }
    );
  }
}
