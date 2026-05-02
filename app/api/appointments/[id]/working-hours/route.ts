import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/prisma/prisma";
import { generateSlots, invalidateSlots } from "@/lib/slots";

export const dynamic = "force-dynamic";

// GET /api/appointments/:id/working-hours - Get working hours for an appointment
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Check if user can access this appointment
    const appointment = await prisma.appointmentType.findUnique({
      where: { id, deletedAt: null },
    });

    if (!appointment) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Appointment not found" } },
        { status: 404 }
      );
    }

    // Check permissions
    if (session.user.role === "organiser" && appointment.organiserId !== session.user.id) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Access denied" } },
        { status: 403 }
      );
    }

    if (session.user.role === "customer") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Customers cannot access working hours" } },
        { status: 403 }
      );
    }

    const workingHours = await prisma.workingHours.findMany({
      where: { appointmentTypeId: id },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    });

    return NextResponse.json({ data: workingHours });
  } catch (error) {
    console.error("Error fetching working hours:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch working hours" } },
      { status: 500 }
    );
  }
}

// POST /api/appointments/:id/working-hours - Add working hours (organiser/admin)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      );
    }

    if (!["organiser", "admin"].includes(session.user.role)) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Insufficient permissions" } },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { dayOfWeek, startTime, endTime } = body;

    // Validate input
    if (dayOfWeek === undefined || !startTime || !endTime) {
      return NextResponse.json(
        { error: { code: "INVALID_INPUT", message: "Missing required fields" } },
        { status: 400 }
      );
    }

    if (dayOfWeek < 0 || dayOfWeek > 6) {
      return NextResponse.json(
        { error: { code: "INVALID_INPUT", message: "dayOfWeek must be 0-6 (0=Sunday)" } },
        { status: 400 }
      );
    }

    // Validate time format (HH:MM)
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      return NextResponse.json(
        { error: { code: "INVALID_INPUT", message: "Time must be in HH:MM format" } },
        { status: 400 }
      );
    }

    if (startTime >= endTime) {
      return NextResponse.json(
        { error: { code: "INVALID_INPUT", message: "Start time must be before end time" } },
        { status: 400 }
      );
    }

    // Check if appointment exists and user has access
    const appointment = await prisma.appointmentType.findUnique({
      where: { id, deletedAt: null },
      include: { workingHours: true },
    });

    if (!appointment) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Appointment not found" } },
        { status: 404 }
      );
    }

    if (session.user.role === "organiser" && appointment.organiserId !== session.user.id) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Access denied" } },
        { status: 403 }
      );
    }

    // Check if schedule type is weekly
    if (appointment.scheduleType !== "weekly") {
      return NextResponse.json(
        { error: { code: "INVALID_INPUT", message: "Working hours only apply to weekly schedules" } },
        { status: 400 }
      );
    }

    // Create working hours
    const workingHour = await prisma.workingHours.create({
      data: {
        appointmentTypeId: id,
        dayOfWeek,
        startTime,
        endTime,
      },
    });

    // Invalidate existing future slots and regenerate
    await prisma.$transaction(async (tx) => {
      await invalidateSlots(id, tx);
      await generateSlots(id, { tx });
    });

    return NextResponse.json({ data: workingHour }, { status: 201 });
  } catch (error) {
    console.error("Error creating working hours:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to create working hours" } },
      { status: 500 }
    );
  }
}

// DELETE /api/appointments/:id/working-hours - Delete all working hours (or by day)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      );
    }

    if (!["organiser", "admin"].includes(session.user.role)) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Insufficient permissions" } },
        { status: 403 }
      );
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const dayOfWeek = searchParams.get("dayOfWeek");

    // Check appointment access
    const appointment = await prisma.appointmentType.findUnique({
      where: { id, deletedAt: null },
    });

    if (!appointment) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Appointment not found" } },
        { status: 404 }
      );
    }

    if (session.user.role === "organiser" && appointment.organiserId !== session.user.id) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Access denied" } },
        { status: 403 }
      );
    }

    // Build delete where clause
    let where: any = { appointmentTypeId: id };
    if (dayOfWeek !== null) {
      where.dayOfWeek = parseInt(dayOfWeek);
    }

    // Delete working hours
    const deleteResult = await prisma.workingHours.deleteMany({
      where,
    });

    // Regenerate slots
    await prisma.$transaction(async (tx) => {
      await invalidateSlots(id, tx);
      await generateSlots(id, { tx });
    });

    return NextResponse.json({
      message: "Working hours deleted",
      count: deleteResult.count,
    });
  } catch (error) {
    console.error("Error deleting working hours:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to delete working hours" } },
      { status: 500 }
    );
  }
}
