import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/prisma/prisma";

export const dynamic = "force-dynamic";

// GET /api/appointments — list published services (customers) or own services (organiser)
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const sort = searchParams.get("sort") || "createdAt";
    const showAll = searchParams.get("showAll") === "true";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(50, parseInt(searchParams.get("limit") || "20"));
    const skip = (page - 1) * limit;

    const role = (session?.user as { role?: string })?.role ?? "customer";

    // Build where clause based on role
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { deletedAt: null };

    if (role === "organiser") {
      // Organisers see their own services (even drafts) AND all other published services
      where.OR = [
        { organiserId: session!.user.id },
        { isPublished: true }
      ];
    } else if (role === "admin") {
      // admins see everything — no extra filter
    } else if (!showAll) {
      // customers (and unauthenticated visitors) see only published services
      where.isPublished = true;
    }

    if (category && category !== "All") {
      where.category = category;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const orderBy =
      sort === "price"
        ? { paymentAmount: "asc" as const }
        : sort === "title"
          ? { title: "asc" as const }
          : { createdAt: "desc" as const };

    const [services, total] = await Promise.all([
      prisma.service.findMany({
        where,
        include: {
          organiser: {
            select: { id: true, name: true, image: true },
          },
          providerSlots: {
            where: {
              isActive: true,
              startTime: { gte: new Date() },
            },
            select: { id: true, capacity: true, booked: true, startTime: true },
            orderBy: { startTime: "asc" },
            take: 100, // enough to get a realistic count
          },
          _count: { select: { bookings: true } },
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.service.count({ where }),
    ]);

    // Compute available slots count per service — sum remaining capacity across all future slots
    const data = services.map((s) => ({
      ...s,
      availableSlots: s.providerSlots.reduce(
        (acc, slot) => acc + Math.max(0, slot.capacity - slot.booked),
        0
      ),
    }));

    return NextResponse.json({
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("GET /api/appointments error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch services" } },
      { status: 500 }
    );
  }
}

// POST /api/appointments — create a new service (organiser/admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      );
    }

    const role = (session.user as { role?: string }).role ?? "customer";
    if (!["organiser", "admin"].includes(role)) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Only organisers can create services" } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
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
      isPublished,
    } = body;

    if (!title || !durationMinutes) {
      return NextResponse.json(
        { error: { code: "INVALID_INPUT", message: "title and durationMinutes are required" } },
        { status: 400 }
      );
    }

    const service = await prisma.service.create({
      data: {
        organiserId: session.user.id,
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
        isPublished: isPublished ?? false,
      },
    });

    return NextResponse.json({ data: service }, { status: 201 });
  } catch (error) {
    console.error("POST /api/appointments error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to create service" } },
      { status: 500 }
    );
  }
}
