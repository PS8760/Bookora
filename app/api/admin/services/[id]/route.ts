import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/prisma/prisma";

export const dynamic = "force-dynamic";

// PATCH /api/admin/services/:id — admin edits any service
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const body = await request.json();
    const {
      title,
      description,
      category,
      icon,
      durationMinutes,
      type,
      isPublished,
      advancePayment,
      paymentAmount,
      currency,
      manualConfirm,
      assignmentMode,
      maxPerSlot,
      venue,
    } = body;

    if (type && !["USER_BASED", "RESOURCE_BASED"].includes(type)) {
      return NextResponse.json(
        { error: { code: "INVALID_INPUT", message: "Invalid type" } },
        { status: 400 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category;
    if (icon !== undefined) updateData.icon = icon;
    if (durationMinutes !== undefined) updateData.durationMinutes = Number(durationMinutes);
    if (type !== undefined) updateData.type = type;
    if (isPublished !== undefined) updateData.isPublished = isPublished;
    if (advancePayment !== undefined) updateData.advancePayment = advancePayment;
    if (paymentAmount !== undefined) updateData.paymentAmount = paymentAmount ? Number(paymentAmount) : null;
    if (currency !== undefined) updateData.currency = currency;
    if (manualConfirm !== undefined) updateData.manualConfirm = manualConfirm;
    if (assignmentMode !== undefined) updateData.assignmentMode = assignmentMode;
    if (maxPerSlot !== undefined) updateData.maxPerSlot = Number(maxPerSlot);
    if (venue !== undefined) updateData.venue = venue;

    const updated = await prisma.service.update({
      where: { id },
      data: updateData,
      include: {
        organiser: { select: { id: true, name: true, email: true } },
        _count: { select: { bookings: true } },
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("PATCH /api/admin/services/:id error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to update service" } },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/services/:id — admin soft-deletes any service
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    await prisma.service.update({
      where: { id },
      data: { deletedAt: new Date(), isPublished: false },
    });

    return NextResponse.json({ message: "Service deleted successfully" });
  } catch (error) {
    console.error("DELETE /api/admin/services/:id error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to delete service" } },
      { status: 500 }
    );
  }
}
