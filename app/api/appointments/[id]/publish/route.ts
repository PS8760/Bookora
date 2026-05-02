import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/prisma/prisma";
import { generateSlots, invalidateSlots } from "@/lib/slots";

export const dynamic = "force-dynamic";

// POST /api/appointments/:id/publish - Publish an appointment
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

    const role = (session.user as { role?: string }).role ?? "customer";
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

    if (role === "organiser" && appointment.organiserId !== session.user.id) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Access denied" } },
        { status: 403 }
      );
    }

    const hasAvailability = appointment.schedules.some(
      (schedule) => schedule.weeklyRules.length > 0 || schedule.flexibleDays.length > 0
    );
    if (!hasAvailability) {
      return NextResponse.json(
        { error: { code: "INVALID_STATE", message: "Cannot publish: no availability configured" } },
        { status: 400 }
      );
    }

    // Generate slots if not already generated
    await generateSlots(id);

    // Publish the appointment
    const updated = await prisma.service.update({
      where: { id },
      data: { isPublished: true },
      include: {
        schedules: { include: { weeklyRules: true, flexibleDays: true } },
        questions: { include: { options: true }, orderBy: { order: "asc" } },
      },
    });

    return NextResponse.json({
      data: updated,
      message: "Appointment published successfully",
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
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      );
    }

    const role = (session.user as { role?: string }).role ?? "customer";
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

    if (role === "organiser" && appointment.organiserId !== session.user.id) {
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
