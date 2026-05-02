import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/prisma/prisma";

export const dynamic = "force-dynamic";

// GET /api/admin/reports — analytics and reports (admin only)
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

    const { searchParams } = new URL(request.url);
    const days = Math.min(365, Math.max(1, parseInt(searchParams.get("days") || "30")));
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Daily booking trends using Prisma (no raw SQL)
    const bookingsInRange = await prisma.booking.findMany({
      where: { createdAt: { gte: startDate } },
      select: { createdAt: true, status: true },
      orderBy: { createdAt: "asc" },
    });

    // Group by date
    const dailyMap = new Map<string, { total: number; confirmed: number }>();
    for (const b of bookingsInRange) {
      const dateKey = b.createdAt.toISOString().slice(0, 10);
      const existing = dailyMap.get(dateKey) ?? { total: 0, confirmed: 0 };
      existing.total++;
      if (b.status === "CONFIRMED") existing.confirmed++;
      dailyMap.set(dateKey, existing);
    }
    const dailyTrends = Array.from(dailyMap.entries()).map(([date, v]) => ({
      date,
      totalBookings: v.total,
      confirmedBookings: v.confirmed,
    }));

    // Service stats
    const services = await prisma.service.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        title: true,
        _count: { select: { bookings: true } },
        bookings: {
          select: { status: true },
        },
      },
      orderBy: { bookings: { _count: "desc" } },
      take: 20,
    });

    const serviceStats = services.map((s) => ({
      serviceId: s.id,
      title: s.title,
      totalBookings: s._count.bookings,
      confirmedBookings: s.bookings.filter((b) => b.status === "CONFIRMED").length,
      pendingBookings: s.bookings.filter((b) => b.status === "PENDING").length,
      cancelledBookings: s.bookings.filter((b) => b.status === "CANCELLED").length,
    }));

    // Booking status breakdown
    const [totalBookings, confirmed, pending, cancelled, completed, noShow] =
      await Promise.all([
        prisma.booking.count(),
        prisma.booking.count({ where: { status: "CONFIRMED" } }),
        prisma.booking.count({ where: { status: "PENDING" } }),
        prisma.booking.count({ where: { status: "CANCELLED" } }),
        prisma.booking.count({ where: { status: "COMPLETED" } }),
        prisma.booking.count({ where: { status: "NO_SHOW" } }),
      ]);

    // Revenue
    const revenueResult = await prisma.payment.aggregate({
      where: { status: "PAID" },
      _sum: { amount: true },
    });

    // Top organisers by booking count
    const topOrganisers = await prisma.user.findMany({
      where: { role: "organiser", deletedAt: null },
      select: {
        id: true,
        name: true,
        email: true,
        organisedServices: {
          where: { deletedAt: null },
          select: {
            _count: { select: { bookings: true } },
          },
        },
      },
    });

    const organisersRanked = topOrganisers
      .map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        totalBookings: u.organisedServices.reduce(
          (acc, s) => acc + s._count.bookings,
          0
        ),
        serviceCount: u.organisedServices.length,
      }))
      .sort((a, b) => b.totalBookings - a.totalBookings)
      .slice(0, 10);

    return NextResponse.json({
      data: {
        overview: {
          totalBookings,
          confirmed,
          pending,
          cancelled,
          completed,
          noShow,
          revenue: Number(revenueResult._sum.amount ?? 0),
        },
        dailyTrends,
        serviceStats,
        topOrganisers: organisersRanked,
      },
      period: { days, from: startDate.toISOString(), to: new Date().toISOString() },
    });
  } catch (error) {
    console.error("GET /api/admin/reports error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to generate reports" } },
      { status: 500 }
    );
  }
}
