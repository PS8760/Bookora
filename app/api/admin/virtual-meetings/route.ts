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
    if ((session.user as { role?: string }).role !== "admin") {
      return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const platform = searchParams.get("platform"); // MEET | ZOOM | all
    const status = searchParams.get("status");     // SCHEDULED | LIVE | COMPLETED | CANCELLED
    const search = searchParams.get("search");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(50, parseInt(searchParams.get("limit") || "20"));
    const skip = (page - 1) * limit;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (platform && platform !== "all") {
      where.platform = platform;
    }
    if (status && status !== "all") {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { booking: { customer: { name: { contains: search, mode: "insensitive" } } } },
        { booking: { service: { title: { contains: search, mode: "insensitive" } } } },
        { booking: { service: { organiser: { name: { contains: search, mode: "insensitive" } } } } },
      ];
    }

    // Auto-update statuses based on current time
    const now = new Date();

    // Mark SCHEDULED meetings that started as LIVE
    await prisma.virtualMeeting.updateMany({
      where: {
        status: "SCHEDULED",
        startTime: { lte: now },
        endTime: { gte: now },
      },
      data: { status: "LIVE" },
    });

    // Mark LIVE meetings that ended as COMPLETED
    await prisma.virtualMeeting.updateMany({
      where: {
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
              customer: { select: { id: true, name: true, email: true } },
              service: {
                select: {
                  id: true,
                  title: true,
                  organiser: { select: { id: true, name: true, email: true } },
                },
              },
            },
          },
        },
        orderBy: { startTime: "desc" },
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
      meetingId: m.meetingId,
      status: m.status,
      startTime: m.startTime,
      endTime: m.endTime,
      customer: m.booking.customer,
      service: {
        id: m.booking.service.id,
        title: m.booking.service.title,
      },
      organiser: m.booking.service.organiser,
      bookingStatus: m.booking.status,
    }));

    return NextResponse.json({
      data: formatted,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("GET /api/admin/virtual-meetings error:", err);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR" } }, { status: 500 });
  }
}
