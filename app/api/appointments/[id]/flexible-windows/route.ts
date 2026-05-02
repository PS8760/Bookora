import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/prisma/prisma";
import { generateSlots, invalidateSlots } from "@/lib/slots";

export const dynamic = "force-dynamic";

// GET /api/appointments/:id/flexible-windows - List flexible schedule windows
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

    if (session.user.role === "customer") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Customers cannot access flexible windows" } },
        { status: 403 }
      );
    }

    const windows = await prisma.flexibleScheduleWindow.findMany({
      where: { appointmentTypeId: id },
      orderBy: { windowStartUtc: "asc" },
    });

    return NextResponse.json({ data: windows });
  } catch (error) {
    console.error("Error fetching flexible windows:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch flexible windows" } },
      { status: 500 }
    );
  }
}

// POST /api/appointments/:id/flexible-windows - Add flexible schedule window
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
    const { windowStartUtc, windowEndUtc } = body;

    // Validate input
    if (!windowStartUtc || !windowEndUtc) {
      return NextResponse.json(
        { error: { code: "INVALID_INPUT", message: "windowStartUtc and windowEndUtc are required" } },
        { status: 400 }
      );
    }

    const startDate = new Date(windowStartUtc);
    const endDate = new Date(windowEndUtc);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: { code: "INVALID_INPUT", message: "Invalid date format" } },
        { status: 400 }
      );
    }

    if (startDate >= endDate) {
      return NextResponse.json(
        { error: { code: "INVALID_INPUT", message: "Start time must be before end time" } },
        { status: 400 }
      );
    }

    // Check appointment access and type
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

    if (appointment.scheduleType !== "flexible") {
      return NextResponse.json(
        { error: { code: "INVALID_INPUT", message: "Flexible windows only apply to flexible schedules" } },
        { status: 400 }
      );
    }

    // Create window and generate slots in transaction
    const result = await prisma.$transaction(async (tx) => {
      const window = await tx.flexibleScheduleWindow.create({
        data: {
          appointmentTypeId: id,
          windowStartUtc: startDate,
          windowEndUtc: endDate,
        },
      });

      // Generate slots for this window
      const slotsCreated = await generateSlots(id, {
        fromDate: startDate,
        toDate: endDate,
        tx,
      });

      return { window, slotsCreated };
    });

    return NextResponse.json(
      {
        data: result.window,
        slotsCreated: result.slotsCreated,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating flexible window:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to create flexible window" } },
      { status: 500 }
    );
  }
}

// DELETE /api/appointments/:id/flexible-windows - Delete windows
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
    const windowId = searchParams.get("windowId");

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

    // Delete windows and invalidate slots
    const result = await prisma.$transaction(async (tx) => {
      let where: any = { appointmentTypeId: id };
      if (windowId) {
        where.id = windowId;
      }

      const deleteResult = await tx.flexibleScheduleWindow.deleteMany({
        where,
      });

      // Invalidate affected slots
      await invalidateSlots(id, tx);

      // Regenerate slots
      await generateSlots(id, { tx });

      return deleteResult;
    });

    return NextResponse.json({
      message: "Flexible windows deleted",
      count: result.count,
    });
  } catch (error) {
    console.error("Error deleting flexible windows:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to delete flexible windows" } },
      { status: 500 }
    );
  }
}
