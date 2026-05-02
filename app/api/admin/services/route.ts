import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/prisma/prisma";

export const dynamic = "force-dynamic";

// GET /api/admin/services — list all services across the platform (admin only)
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
    const search = searchParams.get("search");
    const category = searchParams.get("category");
    const published = searchParams.get("published"); // "true" | "false" | null
    const organiserId = searchParams.get("organiserId");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, parseInt(searchParams.get("limit") || "20"));
    const skip = (page - 1) * limit;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { deletedAt: null };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    if (category && category !== "all") {
      where.category = category;
    }

    if (published === "true") where.isPublished = true;
    if (published === "false") where.isPublished = false;

    if (organiserId) where.organiserId = organiserId;

    const [services, total] = await Promise.all([
      prisma.service.findMany({
        where,
        include: {
          organiser: { select: { id: true, name: true, email: true } },
          _count: { select: { bookings: true, questions: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.service.count({ where }),
    ]);

    return NextResponse.json({
      data: services.map((s) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        category: s.category,
        icon: s.icon,
        durationMinutes: s.durationMinutes,
        type: s.type,
        isPublished: s.isPublished,
        advancePayment: s.advancePayment,
        paymentAmount: s.paymentAmount ? Number(s.paymentAmount) : null,
        currency: s.currency,
        manualConfirm: s.manualConfirm,
        maxPerSlot: s.maxPerSlot,
        venue: s.venue,
        createdAt: s.createdAt,
        organiser: s.organiser,
        bookingCount: s._count.bookings,
        questionCount: s._count.questions,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("GET /api/admin/services error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch services" } },
      { status: 500 }
    );
  }
}

// POST /api/admin/services — admin creates a service on behalf of an organiser
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

    const body = await request.json();
    const {
      organiserId,
      title,
      description,
      category,
      icon,
      durationMinutes,
      type,
      advancePayment,
      paymentAmount,
      currency,
      manualConfirm,
      assignmentMode,
      maxPerSlot,
      venue,
    } = body;

    if (!organiserId || !title || !durationMinutes) {
      return NextResponse.json(
        { error: { code: "INVALID_INPUT", message: "organiserId, title, and durationMinutes are required" } },
        { status: 400 }
      );
    }

    // Verify organiser exists
    const organiser = await prisma.user.findUnique({
      where: { id: organiserId },
      select: { id: true, role: true },
    });

    if (!organiser) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Organiser not found" } },
        { status: 404 }
      );
    }

    if (!["organiser", "admin"].includes(organiser.role)) {
      return NextResponse.json(
        { error: { code: "INVALID_INPUT", message: "Target user must be an organiser or admin" } },
        { status: 400 }
      );
    }

    const service = await prisma.service.create({
      data: {
        organiserId,
        title,
        description,
        category,
        icon,
        durationMinutes: Number(durationMinutes),
        type: type ?? "USER_BASED",
        advancePayment: advancePayment ?? false,
        paymentAmount: paymentAmount ? Number(paymentAmount) : null,
        currency: currency ?? "INR",
        manualConfirm: manualConfirm ?? false,
        assignmentMode: assignmentMode ?? "AUTOMATIC",
        maxPerSlot: maxPerSlot ?? 1,
        venue,
      },
      include: {
        organiser: { select: { id: true, name: true, email: true } },
      },
    });

    // ── Auto-create a default weekly schedule (Mon–Fri, 09:00–18:00) ──────────
    // This ensures the service has bookable slots immediately after creation.
    // The organiser can edit the schedule later via the services page.
    const DEFAULT_DAYS = [1, 2, 3, 4, 5]; // Monday–Friday
    const START_MINUTE = 9 * 60;           // 09:00 → 540 minutes
    const END_MINUTE   = 18 * 60;          // 18:00 → 1080 minutes

    const schedule = await prisma.schedule.create({
      data: {
        serviceId: service.id,
        type: "WEEKLY",
        weeklyRules: {
          create: DEFAULT_DAYS.map((day) => ({
            dayOfWeek: day,
            startMinute: START_MINUTE,
            endMinute: END_MINUTE,
          })),
        },
      },
    });

    // Generate slots for the next 60 days
    try {
      const { generateSlots } = await import("@/lib/slots");
      await generateSlots(service.id);
    } catch (slotErr) {
      // Non-fatal — slots can be regenerated later when the service is published
      console.error("Slot generation after admin service create (non-fatal):", slotErr);
    }

    return NextResponse.json({ data: service }, { status: 201 });
  } catch (error) {
    console.error("POST /api/admin/services error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to create service" } },
      { status: 500 }
    );
  }
}
