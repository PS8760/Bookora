import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/prisma/prisma";

export const dynamic = "force-dynamic";

// GET /api/organiser/reports — analytics for the logged-in organiser
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
    }

    const role = (session.user as { role?: string }).role ?? "customer";
    if (role !== "organiser" && role !== "admin") {
      return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const days = Math.min(365, Math.max(7, parseInt(searchParams.get("days") || "30")));
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Scope to this organiser's services
    const serviceWhere =
      role === "organiser" ? { organiserId: session.user.id, deletedAt: null } : { deletedAt: null };

    const services = await prisma.service.findMany({
      where: serviceWhere,
      select: {
        id: true,
        title: true,
        icon: true,
        durationMinutes: true,
        paymentAmount: true,
        currency: true,
        isPublished: true,
        bookings: {
          select: {
            id: true,
            status: true,
            createdAt: true,
            paymentStatus: true,
            providerSlot: { select: { startTime: true } },
          },
        },
      },
    });

    // ── KPI totals ──────────────────────────────────────────────────────────
    let totalBookings = 0;
    let confirmedBookings = 0;
    let cancelledBookings = 0;
    let completedBookings = 0;
    let totalRevenue = 0;

    const bookingsInRange: { createdAt: Date; status: string }[] = [];

    for (const svc of services) {
      for (const b of svc.bookings) {
        totalBookings++;
        if (b.status === "CONFIRMED") confirmedBookings++;
        if (b.status === "CANCELLED") cancelledBookings++;
        if (b.status === "COMPLETED") completedBookings++;
        if (
          (b.status === "CONFIRMED" || b.status === "COMPLETED") &&
          b.paymentStatus === "PAID" &&
          svc.paymentAmount
        ) {
          totalRevenue += Number(svc.paymentAmount);
        }
        if (b.createdAt >= startDate) {
          bookingsInRange.push({ createdAt: b.createdAt, status: b.status });
        }
      }
    }

    const completionRate =
      totalBookings > 0
        ? Math.round(((confirmedBookings + completedBookings) / totalBookings) * 100)
        : 0;

    const avgPerBooking =
      confirmedBookings + completedBookings > 0
        ? Math.round(totalRevenue / (confirmedBookings + completedBookings))
        : 0;

    // ── Monthly trend (last 6 months) ───────────────────────────────────────
    const monthlyMap = new Map<string, { bookings: number; revenue: number }>();
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleString("en-IN", { month: "short" });
      monthlyMap.set(key, { bookings: 0, revenue: 0 });
    }

    for (const svc of services) {
      for (const b of svc.bookings) {
        const d = new Date(b.createdAt);
        const key = d.toLocaleString("en-IN", { month: "short" });
        if (monthlyMap.has(key)) {
          const entry = monthlyMap.get(key)!;
          entry.bookings++;
          if (
            (b.status === "CONFIRMED" || b.status === "COMPLETED") &&
            b.paymentStatus === "PAID" &&
            svc.paymentAmount
          ) {
            entry.revenue += Number(svc.paymentAmount);
          }
        }
      }
    }

    const monthlyData = Array.from(monthlyMap.entries()).map(([month, v]) => ({
      month,
      bookings: v.bookings,
      revenue: v.revenue,
    }));

    // ── Peak hours (from slot start times) ──────────────────────────────────
    const hourCounts: Record<number, number> = {};
    for (const svc of services) {
      for (const b of svc.bookings) {
        if (b.providerSlot?.startTime) {
          const h = new Date(b.providerSlot.startTime).getHours();
          hourCounts[h] = (hourCounts[h] || 0) + 1;
        }
      }
    }

    const totalSlotBookings = Object.values(hourCounts).reduce((a, b) => a + b, 0) || 1;
    const peakHours = Object.entries(hourCounts)
      .sort((a, b) => Number(b[1]) - Number(a[1]))
      .slice(0, 4)
      .map(([hour, count]) => {
        const h = Number(hour);
        const label = `${h.toString().padStart(2, "0")}:00 – ${(h + 2).toString().padStart(2, "0")}:00`;
        return {
          time: label,
          pct: Math.round((count / totalSlotBookings) * 100),
        };
      });

    // ── Service performance ──────────────────────────────────────────────────
    const serviceStats = services.map((svc) => {
      const total = svc.bookings.length;
      const confirmed = svc.bookings.filter(
        (b) => b.status === "CONFIRMED" || b.status === "COMPLETED"
      ).length;
      const revenue = svc.bookings
        .filter(
          (b) =>
            (b.status === "CONFIRMED" || b.status === "COMPLETED") &&
            b.paymentStatus === "PAID"
        )
        .reduce((acc) => acc + Number(svc.paymentAmount ?? 0), 0);

      return {
        id: svc.id,
        title: svc.title,
        icon: svc.icon,
        bookings: total,
        revenue,
        currency: svc.currency,
        completionRate: total > 0 ? Math.round((confirmed / total) * 100) : 0,
        isPublished: svc.isPublished,
      };
    }).sort((a, b) => b.bookings - a.bookings);

    return NextResponse.json({
      data: {
        kpis: {
          totalRevenue,
          totalBookings,
          avgPerBooking,
          completionRate,
          confirmedBookings,
          cancelledBookings,
        },
        monthlyData,
        peakHours,
        serviceStats,
      },
      period: { days, from: startDate.toISOString(), to: new Date().toISOString() },
    });
  } catch (err) {
    console.error("GET /api/organiser/reports error:", err);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR" } }, { status: 500 });
  }
}
