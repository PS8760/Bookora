import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/prisma/prisma";

export const dynamic = "force-dynamic";

// GET /api/dashboard/organiser — stats + recent bookings for the organiser
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
    }
    const role = (session.user as { role?: string }).role;
    if (role !== "organiser" && role !== "admin") {
      return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
    }

    const organiserId = session.user.id;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      services,
      totalBookings,
      monthBookings,
      pendingBookings,
      recentBookings,
    ] = await Promise.all([
      prisma.service.findMany({
        where: { organiserId, deletedAt: null },
        include: {
          _count: { 
            select: { 
              bookings: {
                where: { status: { in: ["PENDING", "CONFIRMED"] } }
              } 
            } 
          },
          providerSlots: {
            where: { isActive: true, startTime: { gte: now } },
            select: { capacity: true, booked: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.booking.count({ 
        where: { 
          service: { organiserId },
          status: { in: ["PENDING", "CONFIRMED"] }
        } 
      }),
      prisma.booking.count({
        where: { 
          service: { organiserId }, 
          status: { in: ["PENDING", "CONFIRMED"] },
          createdAt: { gte: startOfMonth } 
        },
      }),
      prisma.booking.count({
        where: { service: { organiserId }, status: "PENDING" },
      }),
      prisma.booking.findMany({
        where: { 
          service: { organiserId },
          status: { not: "CANCELLED" }
        },
        include: {
          customer: { select: { id: true, name: true, email: true, image: true } },
          service: { select: { id: true, title: true, icon: true } },
          providerSlot: { select: { startTime: true, endTime: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

    // Revenue: sum of paid payments for this organiser's bookings
    const revenueResult = await prisma.payment.aggregate({
      where: {
        status: "PAID",
        booking: { service: { organiserId } },
      },
      _sum: { amount: true },
    });

    const revenue = Number(revenueResult._sum.amount ?? 0);

    const formattedServices = services.map((s) => ({
      id: s.id,
      title: s.title,
      icon: s.icon ?? "📅",
      category: s.category,
      status: s.isPublished ? "published" : "draft",
      bookings: s._count.bookings,
      availableSlots: s.providerSlots.reduce(
        (acc, slot) => acc + Math.max(0, slot.capacity - slot.booked),
        0
      ),
      durationMinutes: s.durationMinutes,
      paymentAmount: s.paymentAmount ? Number(s.paymentAmount) : null,
      currency: s.currency,
    }));

    return NextResponse.json({
      data: {
        stats: {
          totalBookings,
          monthBookings,
          pendingBookings,
          revenue,
          totalServices: services.length,
          publishedServices: services.filter((s) => s.isPublished).length,
        },
        services: formattedServices,
        recentBookings: recentBookings.map((b) => ({
          id: b.id,
          customer: b.customer,
          service: b.service,
          date: new Date(b.providerSlot.startTime).toLocaleDateString("en-IN", {
            day: "numeric", month: "short", year: "numeric",
          }),
          time: new Date(b.providerSlot.startTime).toLocaleTimeString("en-IN", {
            hour: "2-digit", minute: "2-digit",
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
    console.error("GET /api/dashboard/organiser error:", err);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR" } }, { status: 500 });
  }
}
