import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/prisma/prisma";

export const dynamic = "force-dynamic";

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
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(50, parseInt(searchParams.get("limit") || "20"));
    const skip = (page - 1) * limit;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      booking: { service: { organiserId } },
    };
    if (status && status !== "all") {
      where.status = status;
    }

    // Auto-update statuses
    const now = new Date();
    await prisma.virtualMeeting.updateMany({
      where: {
        booking: { service: { organiserId } },
        status: "SCHEDULED",
        startTime: { lte: now },
        endTime: { gte: now },
      },
      data: { status: "LIVE" },
    });
    await prisma.virtualMeeting.updateMany({
      where: {
        booking: { service: { organiserId } },
        status: { in: ["LIVE", "SCHEDULED"] },
        endTime: { lt: now },
      },
      data: { status: "COMPLETED" },
    });

    const [meetings, total] = await Promise.all([
      prisma.virtualMeeting.findMany({
        where,
        include: {
          booking: {
            include: {
              customer: { select: { id: true, name: true, email: true, image: true } },
              service: { select: { id: true, title: true } },
            },
          },
        },
        orderBy: { startTime: "asc" },
        skip,
        take: limit,
      }),
      prisma.virtualMeeting.count({ where }),
    ]);

    const formatted = meetings.map((m) => ({
      id: m.id,
      bookingId: m.bookingId,
      platform: m.platform,
      meetingLink: m.meetingLink,
      status: m.status,
      startTime: m.startTime,
      endTime: m.endTime,
      customer: m.booking.customer,
      service: m.booking.service,
    }));

    return NextResponse.json({
      data: formatted,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("GET /api/organiser/virtual-meetings error:", err);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR" } }, { status: 500 });
  }
}
