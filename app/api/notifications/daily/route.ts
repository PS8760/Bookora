import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/prisma/prisma";
import { sendNotification } from "@/lib/notifications";

export const dynamic = "force-dynamic";

/**
 * POST /api/notifications/daily
 * Sends daily digest notifications to all active users.
 * - Organisers: today's booking count, pending requests, upcoming appointments
 * - Customers: upcoming appointment count, next appointment time
 *
 * Call this from a cron job at 8 AM daily, or hit it manually as admin.
 */
export async function POST(request: NextRequest) {
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
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    let digestsSent = 0;

    // ─── Organiser Digests ────────────────────────────────────────────────────
    const organisers = await prisma.user.findMany({
      where: { role: "organiser", isActive: true, deletedAt: null },
      select: { id: true, name: true },
    });

    for (const organiser of organisers) {
      try {
        const [todayBookings, pendingBookings, upcomingAppointments] = await Promise.all([
          // New bookings created today
          prisma.booking.count({
            where: {
              service: { organiserId: organiser.id },
              createdAt: { gte: todayStart, lte: todayEnd },
            },
          }),
          // Pending bookings (awaiting manual confirmation)
          prisma.booking.count({
            where: {
              service: { organiserId: organiser.id },
              status: "PENDING",
            },
          }),
          // Upcoming confirmed appointments
          prisma.booking.count({
            where: {
              service: { organiserId: organiser.id },
              status: "CONFIRMED",
              providerSlot: { startTime: { gte: now } },
            },
          }),
        ]);

        // Calculate today's revenue
        const payments = await prisma.payment.aggregate({
          _sum: { amount: true },
          where: {
            booking: { service: { organiserId: organiser.id } },
            status: "PAID",
            paidAt: { gte: todayStart, lte: todayEnd },
          },
        });
        const revenue = Number(payments._sum.amount ?? 0);

        const parts: string[] = [];
        parts.push(`📅 Daily Summary for ${new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}`);
        parts.push(`• ${todayBookings} new booking${todayBookings !== 1 ? "s" : ""} today`);
        parts.push(`• ${pendingBookings} pending request${pendingBookings !== 1 ? "s" : ""} awaiting confirmation`);
        parts.push(`• ${upcomingAppointments} upcoming confirmed appointment${upcomingAppointments !== 1 ? "s" : ""}`);
        if (revenue > 0) {
          parts.push(`• ₹${revenue.toLocaleString("en-IN")} revenue today`);
        }
        parts.push(`\nHave a productive day! 🚀`);

        await sendNotification({
          userId: organiser.id,
          subject: "Your Daily Summary 📊",
          body: parts.join("\n"),
          channels: ["PUSH"],
        });

        digestsSent++;
      } catch (err) {
        console.error(`Daily digest failed for organiser ${organiser.id}:`, err);
      }
    }

    // ─── Customer Digests ─────────────────────────────────────────────────────
    const customers = await prisma.user.findMany({
      where: { role: "customer", isActive: true, deletedAt: null },
      select: { id: true, name: true },
    });

    for (const customer of customers) {
      try {
        const upcomingBookings = await prisma.booking.findMany({
          where: {
            customerId: customer.id,
            status: { in: ["PENDING", "CONFIRMED"] },
            providerSlot: { startTime: { gte: now } },
          },
          include: {
            service: { select: { title: true } },
            providerSlot: { select: { startTime: true } },
          },
          orderBy: { providerSlot: { startTime: "asc" } },
          take: 3,
        });

        if (upcomingBookings.length === 0) continue; // Skip customers with no upcoming bookings

        const nextAppt = upcomingBookings[0];
        const nextDateTime = new Date(nextAppt.providerSlot.startTime).toLocaleString("en-IN", {
          weekday: "short",
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        });

        const parts: string[] = [];
        parts.push(`Hi ${customer.name.split(" ")[0]}! Here's your schedule:`);
        parts.push(`\n📌 Next appointment: "${nextAppt.service.title}" on ${nextDateTime}`);
        if (upcomingBookings.length > 1) {
          parts.push(`📋 ${upcomingBookings.length} total upcoming appointments`);
        }
        parts.push(`\nDon't forget to prepare! See you soon. 😊`);

        await sendNotification({
          userId: customer.id,
          subject: "Your Upcoming Appointments 📅",
          body: parts.join("\n"),
          channels: ["PUSH"],
        });

        digestsSent++;
      } catch (err) {
        console.error(`Daily digest failed for customer ${customer.id}:`, err);
      }
    }

    return NextResponse.json({
      message: "Daily digests sent successfully",
      data: {
        digestsSent,
        organisers: organisers.length,
        customers: customers.length,
        timestamp: now.toISOString(),
      },
    });
  } catch (error) {
    console.error("POST /api/notifications/daily error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to send daily digests" } },
      { status: 500 }
    );
  }
}

/**
 * GET /api/notifications/daily — Returns stats about today's notifications (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
    }

    if ((session.user as { role?: string }).role !== "admin") {
      return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [total, sent, failed, queued] = await Promise.all([
      prisma.notification.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.notification.count({ where: { createdAt: { gte: todayStart }, status: "SENT" } }),
      prisma.notification.count({ where: { createdAt: { gte: todayStart }, status: "FAILED" } }),
      prisma.notification.count({ where: { createdAt: { gte: todayStart }, status: "QUEUED" } }),
    ]);

    return NextResponse.json({
      data: { today: { total, sent, failed, queued } },
    });
  } catch (error) {
    console.error("GET /api/notifications/daily error:", error);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR" } }, { status: 500 });
  }
}
