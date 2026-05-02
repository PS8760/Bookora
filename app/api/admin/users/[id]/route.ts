import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/prisma/prisma";

export const dynamic = "force-dynamic";

// GET /api/admin/users/:id — get a single user's full profile
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
    }
    if ((session.user as { role?: string }).role !== "admin") {
      return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
    }

    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        emailVerified: true,
        image: true,
        timezone: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            customerBookings: true,
            organisedServices: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "User not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: user });
  } catch (err) {
    console.error("GET /api/admin/users/:id error:", err);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR" } }, { status: 500 });
  }
}

// PATCH /api/admin/users/:id — update role, status, and profile fields
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
    }
    if ((session.user as { role?: string }).role !== "admin") {
      return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { role, isActive, name, timezone, email } = body;

    const validRoles = ["customer", "organiser", "admin"];
    if (role && !validRoles.includes(role)) {
      return NextResponse.json(
        { error: { code: "INVALID_INPUT", message: "Invalid role" } },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (role !== undefined) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (name !== undefined) updateData.name = String(name).trim();
    if (timezone !== undefined) updateData.timezone = String(timezone).trim();
    if (email !== undefined) updateData.email = String(email).trim().toLowerCase();

    if (updateData.email && !String(updateData.email).includes("@")) {
      return NextResponse.json(
        { error: { code: "INVALID_INPUT", message: "Invalid email format" } },
        { status: 400 }
      );
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        timezone: true,
      },
    });

    return NextResponse.json({ data: updated });
  } catch (err: unknown) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (err as any).code === "P2002"
    ) {
      return NextResponse.json(
        { error: { code: "CONFLICT", message: "Email already in use" } },
        { status: 409 }
      );
    }
    console.error("PATCH /api/admin/users/:id error:", err);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR" } }, { status: 500 });
  }
}

// DELETE /api/admin/users/:id — soft delete a user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
    }
    if ((session.user as { role?: string }).role !== "admin") {
      return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
    }

    const { id } = await params;

    // Prevent self-deletion
    if (id === session.user.id) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Cannot delete your own account" } },
        { status: 403 }
      );
    }

    await prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });

    return NextResponse.json({ message: "User deleted successfully" });
  } catch (err) {
    console.error("DELETE /api/admin/users/:id error:", err);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR" } }, { status: 500 });
  }
}
