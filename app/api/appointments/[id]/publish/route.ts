import { NextRequest, NextResponse } from "next/server";
import prisma from "@/prisma/prisma";
import { generateSlots, invalidateSlots } from "@/lib/slots";
import { invalidateServiceCache } from "@/lib/slot-cache";
import { getSessionWithRole } from "@/lib/session";

export const dynamic = "force-dynamic";

// POST /api/appointments/:id/publish - Publish an appointment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionWithRole(request);

    if (!user) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      );
    }

    const role = user.role;
    if (!["organiser", "admin"].includes(role)) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Insufficient permissions" } },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Check if appointment exists and user has access
    const appointment = await prisma.service.findFirst({
      where: { id, deletedAt: null },
      include: {
        schedules: {
          include: { weeklyRules: true, flexibleDays: true },
        },
        questions: { include: { options: true }, orderBy: { order: "asc" } },
      },
    });

    if (!appointment) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Appointment not found" } },
        { status: 404 }
      );
    }

    if (role === "organiser" && appointment.organiserId !== user.userId) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Access denied" } },
        { status: 403 }
      );
    }

    const hasAvailability = appointment.schedules.some(
      (schedule) => schedule.weeklyRules.length > 0 || schedule.flexibleDays.length > 0
    );

    // If no schedule exists at all, create a default Mon–Fri 9am–6pm schedule
    if (appointment.schedules.length === 0) {
      const DEFAULT_DAYS = [1, 2, 3, 4, 5];
      const START_MINUTE = 9 * 60;
      const END_MINUTE   = 18 * 60;

      await prisma.schedule.create({
        data: {
          serviceId: id,
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
    }

    // Generate slots only if availability is configured — publishing succeeds either way
    if (hasAvailability || appointment.schedules.length === 0) {
      try {
        await generateSlots(id);
      } catch (slotError) {
        console.error("Slot generation error during publish (non-fatal):", slotError);
      }
    }

    // Publish the appointment
    const updated = await prisma.service.update({
      where: { id },
      data: { isPublished: true },
      include: {
        schedules: { include: { weeklyRules: true, flexibleDays: true } },
        questions: { include: { options: true }, orderBy: { order: "asc" } },
      },
    });

    // Bust slot cache so customers see fresh slots immediately
    invalidateServiceCache(id);

    return NextResponse.json({
      data: updated,
      message: hasAvailability
        ? "Appointment published successfully"
        : "Appointment published with default Mon–Fri 9am–6pm schedule. Edit availability to customise.",
    });
  } catch (error) {
    console.error("Error publishing appointment:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to publish appointment" } },
      { status: 500 }
    );
  }
}

// POST /api/appointments/:id/unpublish - Unpublish an appointment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionWithRole(request);

    if (!user) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      );
    }

    const role = user.role;
    if (!["organiser", "admin"].includes(role)) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Insufficient permissions" } },
        { status: 403 }
      );
    }

    const { id } = await params;

    const appointment = await prisma.service.findFirst({
      where: { id, deletedAt: null },
    });

    if (!appointment) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Appointment not found" } },
        { status: 404 }
      );
    }

    if (role === "organiser" && appointment.organiserId !== user.userId) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Access denied" } },
        { status: 403 }
      );
    }

    try {
      await invalidateSlots(id);
    } catch (slotError) {
      // Unpublishing should still succeed even if slot cleanup fails.
      console.error("Error invalidating slots during unpublish:", slotError);
    }

    const updated = await prisma.service.update({
      where: { id },
      data: {
        isPublished: false,
        shareToken: null,
      },
    });

    // Bust slot cache
    invalidateServiceCache(id);

    return NextResponse.json({
      data: updated,
      message: "Appointment unpublished successfully",
    });
  } catch (error) {
    console.error("Error unpublishing appointment:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to unpublish appointment" } },
      { status: 500 }
    );
  }
}
