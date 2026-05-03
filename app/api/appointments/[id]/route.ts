import { NextRequest, NextResponse } from "next/server";
import prisma from "@/prisma/prisma";
import { invalidateSlots, generateSlots } from "@/lib/slots";
import { getSessionWithRole } from "@/lib/session";

export const dynamic = "force-dynamic";

// GET /api/appointments/:id — get single service details
export async function GET(
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

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const shareToken = searchParams.get("share");
    const role = user.role;

    const service = await prisma.service.findUnique({
      where: { id, deletedAt: null },
      include: {
        organiser: { select: { id: true, name: true, email: true, image: true } },
        schedules: {
          include: { weeklyRules: true, flexibleDays: true },
        },
        questions: {
          include: { options: true },
          orderBy: { order: "asc" },
        },
        _count: { select: { bookings: true } },
      },
    });

    if (!service) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Service not found" } },
        { status: 404 }
      );
    }

    if (role === "customer" && !service.isPublished && shareToken !== service.shareToken) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Service not published" } },
        { status: 403 }
      );
    }

    if (role === "organiser" &&
      !service.isPublished &&
      service.organiserId !== user.userId
    ) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Access denied" } },
        { status: 403 }
      );
    }

    return NextResponse.json({ data: service });
  } catch (error) {
    console.error("GET /api/appointments/:id error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch service" } },
      { status: 500 }
    );
  }
}

// PATCH /api/appointments/:id — update service
export async function PATCH(
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
    const body = await request.json();

    const existing = await prisma.service.findUnique({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Service not found" } },
        { status: 404 }
      );
    }

    if (role === "organiser" && existing.organiserId !== user.userId) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Access denied" } },
        { status: 403 }
      );
    }

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
      introMessage,
      confirmMessage,
      deliveryMode,
      virtualPlatform,
      physicalAddress,
      physicalRoom,
      mapsLink,
      virtualPrice,
      physicalPrice,
      virtualDuration,
      physicalDuration,
    } = body;

    // Validate enums if provided
    if (type && !["USER_BASED", "RESOURCE_BASED"].includes(type)) {
      return NextResponse.json(
        { error: { code: "INVALID_INPUT", message: "Invalid type. Must be USER_BASED or RESOURCE_BASED" } },
        { status: 400 }
      );
    }

    if (assignmentMode && !["AUTOMATIC", "MANUAL"].includes(assignmentMode)) {
      return NextResponse.json(
        { error: { code: "INVALID_INPUT", message: "Invalid assignmentMode. Must be AUTOMATIC or MANUAL" } },
        { status: 400 }
      );
    }

    // Detect if duration changed — requires slot regeneration
    const durationChanged =
      durationMinutes !== undefined &&
      Number(durationMinutes) !== existing.durationMinutes;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category;
    if (icon !== undefined) updateData.icon = icon;
    if (durationMinutes !== undefined) updateData.durationMinutes = Number(durationMinutes);
    if (type !== undefined) updateData.type = type;
    if (advancePayment !== undefined) updateData.advancePayment = advancePayment;
    if (paymentAmount !== undefined) updateData.paymentAmount = paymentAmount ? Number(paymentAmount) : null;
    if (currency !== undefined) updateData.currency = currency;
    if (manualConfirm !== undefined) updateData.manualConfirm = manualConfirm;
    if (assignmentMode !== undefined) updateData.assignmentMode = assignmentMode;
    if (maxPerSlot !== undefined) updateData.maxPerSlot = Number(maxPerSlot);
    if (venue !== undefined) updateData.venue = venue;
    if (introMessage !== undefined) updateData.introMessage = introMessage || null;
    if (confirmMessage !== undefined) updateData.confirmMessage = confirmMessage || null;
    if (deliveryMode !== undefined) updateData.deliveryMode = deliveryMode;
    if (virtualPlatform !== undefined) updateData.virtualPlatform = virtualPlatform;
    if (physicalAddress !== undefined) updateData.physicalAddress = physicalAddress;
    if (physicalRoom !== undefined) updateData.physicalRoom = physicalRoom;
    if (mapsLink !== undefined) updateData.mapsLink = mapsLink;
    if (virtualPrice !== undefined) updateData.virtualPrice = virtualPrice ? Number(virtualPrice) : null;
    if (physicalPrice !== undefined) updateData.physicalPrice = physicalPrice ? Number(physicalPrice) : null;
    if (virtualDuration !== undefined) updateData.virtualDuration = virtualDuration ? Number(virtualDuration) : null;
    if (physicalDuration !== undefined) updateData.physicalDuration = physicalDuration ? Number(physicalDuration) : null;

    const updated = await prisma.$transaction(async (tx) => {
      const svc = await tx.service.update({
        where: { id },
        data: updateData,
        include: {
          schedules: { include: { weeklyRules: true, flexibleDays: true } },
          questions: { include: { options: true }, orderBy: { order: "asc" } },
        },
      });

      if (durationChanged && svc.isPublished) {
        await invalidateSlots(id, tx);
        await generateSlots(id, { tx });
      }

      return svc;
    }, {
      timeout: 15000
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("PATCH /api/appointments/:id error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to update service" } },
      { status: 500 }
    );
  }
}

// DELETE /api/appointments/:id — soft delete service
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

    const existing = await prisma.service.findUnique({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Service not found" } },
        { status: 404 }
      );
    }

    if (role === "organiser" && existing.organiserId !== user.userId) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Access denied" } },
        { status: 403 }
      );
    }

    await prisma.service.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ message: "Service deleted successfully" });
  } catch (error) {
    console.error("DELETE /api/appointments/:id error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to delete service" } },
      { status: 500 }
    );
  }
}
