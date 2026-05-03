import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/prisma/prisma";
import { generateSlots } from "@/lib/slots";
import { sendNotification, NotificationTemplates } from "@/lib/notifications";

export const dynamic = "force-dynamic";

// GET /api/appointments — list published services (customers) or own services (organiser)
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const scope = searchParams.get("scope");
    const sort = searchParams.get("sort") || "createdAt";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(50, parseInt(searchParams.get("limit") || "20"));
    const skip = (page - 1) * limit;

    const role = (session?.user as { role?: string })?.role ?? "customer";

    // Build where clause based on role
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { deletedAt: null };

    if (role === "admin") {
      // admins see everything
    } else if (role === "organiser" && scope === "own") {
      // Management view: see own services (including drafts)
      where.organiserId = session!.user.id;
    } else {
      // Public view: customers and organisers see all published services
      where.isPublished = true;
      // Organisers also want to see their own drafts in the public list? 
      // Usually no, but they might. For now, let's keep it simple: published only.
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
          _count: { 
            select: { 
              bookings: {
                where: { status: { in: ["PENDING", "CONFIRMED"] } }
              } 
            } 
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.service.count({ where }),
    ]);

    // Compute available slots count per service — sum remaining capacity across all future slots
    let data = services.map((s) => ({
      ...s,
      availableSlots: s.providerSlots.reduce(
        (acc, slot) => acc + Math.max(0, slot.capacity - slot.booked),
        0
      ),
    }));

    // If public view, filter out fully booked services
    if (role === "customer" || (role === "organiser" && scope !== "own")) {
      data = data.filter((s) => s.availableSlots > 0);
    }

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

    // Create a default weekly schedule (Mon-Fri, 9 AM - 5 PM)
    // This ensures services have slots available immediately
    try {
      const schedule = await prisma.schedule.create({
        data: {
          serviceId: service.id,
          type: "WEEKLY",
          weeklyRules: {
            createMany: {
              data: [
                { dayOfWeek: 1, startMinute: 540, endMinute: 1020 }, // Monday 9:00-17:00
                { dayOfWeek: 2, startMinute: 540, endMinute: 1020 }, // Tuesday
                { dayOfWeek: 3, startMinute: 540, endMinute: 1020 }, // Wednesday
                { dayOfWeek: 4, startMinute: 540, endMinute: 1020 }, // Thursday
                { dayOfWeek: 5, startMinute: 540, endMinute: 1020 }, // Friday
              ],
            },
          },
        },
      });

      // Generate slots for the next 60 days
      await generateSlots(service.id);

      // Send notification to organiser
      const organiser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { name: true },
      });

      if (organiser) {
        const template = NotificationTemplates.SERVICE_CREATED(organiser.name, service.title);
        await sendNotification({
          userId: session.user.id,
          ...template,
        });
      }
    } catch (scheduleError) {
      console.error("Failed to create default schedule:", scheduleError);
      // Service is still created, organiser can configure schedule manually
    }

    return NextResponse.json({ data: service }, { status: 201 });
  } catch (error) {
    console.error("POST /api/appointments error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to create service" } },
      { status: 500 }
    );
  }
}
