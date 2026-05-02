import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/prisma/prisma";

export const dynamic = "force-dynamic";

// GET /api/dashboard/admin — platform-wide stats
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
    }
    if ((session.user as { role?: string }).role !== "admin") {
      return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
    }

    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - 7);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalUsers,
      weekUsers,
      totalOrganisers,
      totalServices,
      publishedServices,
      totalBookings,
      monthBookings,
      pendingBookings,
      confirmedBookings,
      cancelledBookings,
      recentUsers,
      recentBookings,
    ] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.user.count({ where: { deletedAt: null, createdAt: { gte: startOfWeek } } }),
      prisma.user.count({ where: { deletedAt: null, role: "organiser" } }),
      prisma.service.count({ where: { deletedAt: null } }),
      prisma.service.count({ where: { deletedAt: null, isPublished: true } }),
      prisma.booking.count(),
      prisma.booking.count({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.booking.count({ where: { status: "PENDING" } }),
      prisma.booking.count({ where: { status: "CONFIRMED" } }),
      prisma.booking.count({ where: { status: "CANCELLED" } }),
      prisma.user.findMany({
        where: { deletedAt: null },
        select: {
          id: true, name: true, email: true, role: true,
          isActive: true, createdAt: true, image: true,
        },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
      prisma.booking.findMany({
        include: {
          customer: { select: { id: true, name: true, email: true } },
          service: { select: { id: true, title: true } },
          providerSlot: { select: { startTime: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
    ]);

    const revenueResult = await prisma.payment.aggregate({
      where: { status: "PAID" },
      _sum: { amount: true },
    });

    return NextResponse.json({
      data: {
        stats: {
          totalUsers,
          weekUsers,
          totalOrganisers,
          totalServices,
          publishedServices,
          totalBookings,
          monthBookings,
          pendingBookings,
          confirmedBookings,
          cancelledBookings,
          revenue: Number(revenueResult._sum.amount ?? 0),
        },
        recentUsers: recentUsers.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          isActive: u.isActive,
          image: u.image,
          joined: new Date(u.createdAt).toLocaleDateString("en-IN", {
            day: "numeric", month: "short", year: "numeric",
          }),
        })),
        recentBookings: recentBookings.map((b) => ({
          id: b.id,
          customer: b.customer,
          service: b.service,
          date: new Date(b.providerSlot.startTime).toLocaleDateString("en-IN", {
            day: "numeric", month: "short", year: "numeric",
          }),
          status: b.status.toLowerCase(),
        })),
        user: {
          name: session.user.name,
          email: session.user.email,
          image: session.user.image,
        },
      },
    });
  } catch (err) {
    console.error("GET /api/dashboard/admin error:", err);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR" } }, { status: 500 });
  }
}
