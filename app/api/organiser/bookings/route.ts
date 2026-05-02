import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/prisma/prisma";

export const dynamic = "force-dynamic";

// GET /api/organiser/bookings — bookings for the organiser's own services
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      );
    }

    const role = (session.user as { role?: string }).role ?? "customer";
    if (role !== "organiser" && role !== "admin") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Organiser access required" } },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const serviceId = searchParams.get("serviceId");
    const search = searchParams.get("search");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(50, parseInt(searchParams.get("limit") || "20"));
    const skip = (page - 1) * limit;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    // Organisers only see bookings for their own services
    if (role === "organiser") {
      where.service = { organiserId: session.user.id };
    }

    if (status) where.status = status;

    if (search) {
      where.OR = [
        { customer: { name: { contains: search, mode: "insensitive" } } },
        { customer: { email: { contains: search, mode: "insensitive" } } },
        { service: { title: { contains: search, mode: "insensitive" } } },
      ];
    }

    if (serviceId) {
      // Verify organiser owns this service
      if (role === "organiser") {
        const owned = await prisma.service.findFirst({
          where: { id: serviceId, organiserId: session.user.id },
          select: { id: true },
        });
        if (!owned) {
          return NextResponse.json(
            { error: { code: "FORBIDDEN", message: "You don't own this service" } },
            { status: 403 }
          );
        }
      }
      where.serviceId = serviceId;
    }

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true, email: true } },
          service: { select: { id: true, title: true } },
          providerSlot: { select: { id: true, startTime: true, endTime: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.booking.count({ where }),
    ]);

    return NextResponse.json({
      data: bookings.map((b) => ({
        id: b.id,
        status: b.status,
        paymentStatus: b.paymentStatus,
        notes: b.notes,
        createdAt: b.createdAt,
        confirmedAt: b.confirmedAt,
        cancelledAt: b.cancelledAt,
        customer: b.customer,
        service: b.service,
        slot: {
          id: b.providerSlot.id,
          start: b.providerSlot.startTime,
          end: b.providerSlot.endTime,
        },
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("GET /api/organiser/bookings error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch bookings" } },
      { status: 500 }
    );
  }
}
