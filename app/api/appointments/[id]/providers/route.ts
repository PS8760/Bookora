import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/prisma/prisma";

export const dynamic = "force-dynamic";

// GET /api/appointments/:id/providers - List providers for an appointment
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

    if (session.user.role === "customer") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Customers cannot access providers" } },
        { status: 403 }
      );
    }

    const providers = await prisma.appointmentProvider.findMany({
      where: { appointmentTypeId: id },
      include: {
        user: {
          select: { id: true, fullName: true, email: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ data: providers });
  } catch (error) {
    console.error("Error fetching providers:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch providers" } },
      { status: 500 }
    );
  }
}

// POST /api/appointments/:id/providers - Add a provider/resource
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
    const {
      providerType,
      userId,
      resourceName,
      resourceCapacity,
      linkedResources,
    } = body;

    // Validate appointment exists and user has access
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

    // Validate providerType
    if (!["user", "resource"].includes(providerType)) {
      return NextResponse.json(
        { error: { code: "INVALID_INPUT", message: "Invalid providerType" } },
        { status: 400 }
      );
    }

    // Validate based on provider type
    if (providerType === "user") {
      if (!userId) {
        return NextResponse.json(
          { error: { code: "INVALID_INPUT", message: "userId is required for user providers" } },
          { status: 400 }
        );
      }

      // Verify user exists and is active
      const user = await prisma.user.findUnique({
        where: { id: userId, isActive: true, deletedAt: null },
      });

      if (!user) {
        return NextResponse.json(
          { error: { code: "NOT_FOUND", message: "User not found or inactive" } },
          { status: 404 }
        );
      }
    } else if (providerType === "resource") {
      if (!resourceName) {
        return NextResponse.json(
          { error: { code: "INVALID_INPUT", message: "resourceName is required for resource providers" } },
          { status: 400 }
        );
      }
    }

    // Create provider
    const provider = await prisma.appointmentProvider.create({
      data: {
        appointmentTypeId: id,
        providerType,
        userId: providerType === "user" ? userId : null,
        resourceName: providerType === "resource" ? resourceName : null,
        resourceCapacity: providerType === "resource" ? (resourceCapacity || 1) : 1,
        linkedResources: linkedResources || null,
        isActive: true,
      },
      include: {
        user: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });

    return NextResponse.json({ data: provider }, { status: 201 });
  } catch (error) {
    console.error("Error creating provider:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to create provider" } },
      { status: 500 }
    );
  }
}
