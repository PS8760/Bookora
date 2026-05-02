import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/prisma/prisma";
import { getAvailableSlots } from "@/lib/slots";

export const dynamic = "force-dynamic";

// GET /api/appointments/:id/slots - Get available slots for a date
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
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date"); // YYYY-MM-DD
    const resourceId = searchParams.get("resourceId");
    const shareToken = searchParams.get("share");

    // Validate date
    if (!date) {
      return NextResponse.json(
        { error: { code: "INVALID_INPUT", message: "date parameter is required (YYYY-MM-DD)" } },
        { status: 400 }
      );
    }

    const role = (session.user as { role?: string }).role ?? "customer";

    // Check if service exists and is accessible
    const service = await prisma.service.findFirst({
      where: { id, deletedAt: null },
    });

    if (!service) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Appointment not found" } },
        { status: 404 }
      );
    }

    // Check permissions
    if (role === "customer") {
      if (!service.isPublished && shareToken !== service.shareToken) {
        return NextResponse.json(
          { error: { code: "FORBIDDEN", message: "Appointment not published" } },
          { status: 403 }
        );
      }
    } else if (role === "organiser") {
      if (service.organiserId !== session.user.id) {
        return NextResponse.json(
          { error: { code: "FORBIDDEN", message: "Access denied" } },
          { status: 403 }
        );
      }
    }

    // Get available slots
    const slots = await getAvailableSlots(id, date, resourceId || undefined);

    // Format response
    const formattedSlots = slots.map((slot) => ({
      id: slot.id,
      time: new Date(slot.startUtc).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),
      available: true,
      remainingCapacity: slot.remaining,
      maxCapacity: slot.maxCapacity,
      providerId: slot.providerId,
      providerName: slot.providerName,
    }));

    return NextResponse.json({ data: formattedSlots });
  } catch (error) {
    console.error("Error fetching slots:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch slots" } },
      { status: 500 }
    );
  }
}
