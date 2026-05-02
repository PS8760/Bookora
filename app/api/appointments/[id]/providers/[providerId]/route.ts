import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/prisma/prisma";

export const dynamic = "force-dynamic";

// PATCH /api/appointments/:id/providers/:providerId - Update provider
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; providerId: string }> }
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

    const { id, providerId } = await params;
    const body = await request.json();
    const {
      resourceName,
      resourceCapacity,
      linkedResources,
      isActive,
    } = body;

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

    // Check provider exists and belongs to this appointment
    const existingProvider = await prisma.appointmentProvider.findFirst({
      where: { id: providerId, appointmentTypeId: id },
    });

    if (!existingProvider) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Provider not found" } },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: any = {};
    if (resourceName !== undefined) updateData.resourceName = resourceName;
    if (resourceCapacity !== undefined) updateData.resourceCapacity = resourceCapacity;
    if (linkedResources !== undefined) updateData.linkedResources = linkedResources;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updated = await prisma.appointmentProvider.update({
      where: { id: providerId },
      data: updateData,
      include: {
        user: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("Error updating provider:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to update provider" } },
      { status: 500 }
    );
  }
}

// DELETE /api/appointments/:id/providers/:providerId - Delete provider
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; providerId: string }> }
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

    const { id, providerId } = await params;

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

    // Check provider exists
    const existingProvider = await prisma.appointmentProvider.findFirst({
      where: { id: providerId, appointmentTypeId: id },
    });

    if (!existingProvider) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Provider not found" } },
        { status: 404 }
      );
    }

    // Delete provider (this will check for active bookings via business logic)
    const activeBookings = await prisma.booking.findFirst({
      where: {
        providerId: providerId,
        status: { in: ["pending_payment", "request", "confirmed"] },
      },
    });

    if (activeBookings) {
      return NextResponse.json(
        { error: { code: "CONFLICT", message: "Cannot delete provider with active bookings" } },
        { status: 409 }
      );
    }

    await prisma.appointmentProvider.delete({
      where: { id: providerId },
    });

    return NextResponse.json({ message: "Provider deleted successfully" });
  } catch (error) {
    console.error("Error deleting provider:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to delete provider" } },
      { status: 500 }
    );
  }
}
