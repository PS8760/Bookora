import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/prisma/prisma";

export const dynamic = "force-dynamic";

// GET /api/profile — fetch the logged-in user's profile
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        timezone: true,
        emailVerified: true,
        createdAt: true,
        providerProfile: {
          select: {
            bio: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 });
    }

    return NextResponse.json({
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: user.role,
        timezone: user.timezone,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        bio: user.providerProfile?.bio ?? "",
        avatarUrl: user.providerProfile?.avatarUrl ?? null,
      },
    });
  } catch (err) {
    console.error("GET /api/profile error:", err);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR" } }, { status: 500 });
  }
}

// PATCH /api/profile — update the logged-in user's profile
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
    }

    const body = await request.json();
    const { name, timezone, bio } = body;

    // Update user base fields
    const userUpdate: Record<string, unknown> = {};
    if (name !== undefined && String(name).trim()) userUpdate.name = String(name).trim();
    if (timezone !== undefined) userUpdate.timezone = timezone;

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: userUpdate,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        timezone: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    // Update bio in provider profile (upsert so it works for all roles)
    if (bio !== undefined) {
      await prisma.providerProfile.upsert({
        where: { userId: session.user.id },
        update: { bio },
        create: { userId: session.user.id, bio },
      });
    }

    return NextResponse.json({ data: updatedUser });
  } catch (err) {
    console.error("PATCH /api/profile error:", err);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR" } }, { status: 500 });
  }
}

// DELETE /api/profile — permanently delete the logged-in user's account
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
    }

    const userId = session.user.id;

    // Hard-delete in a transaction: remove all related data first to satisfy FK constraints,
    // then delete the user row itself.
    await prisma.$transaction(async (tx) => {
      // Cancel / delete bookings made by this user
      await tx.booking.deleteMany({ where: { customerId: userId } });

      // Delete provider slots for services owned by this user
      const userServices = await tx.service.findMany({
        where: { organiserId: userId },
        select: { id: true },
      });
      const serviceIds = userServices.map((s) => s.id);

      if (serviceIds.length > 0) {
        await tx.booking.deleteMany({ where: { serviceId: { in: serviceIds } } });
        await tx.providerSlot.deleteMany({ where: { serviceId: { in: serviceIds } } });
        await tx.question.deleteMany({ where: { serviceId: { in: serviceIds } } });
        await tx.schedule.deleteMany({ where: { serviceId: { in: serviceIds } } });
        await tx.service.deleteMany({ where: { organiserId: userId } });
      }

      // Delete provider profile if exists
      await tx.providerProfile.deleteMany({ where: { userId } });

      // Delete audit logs referencing this user
      await tx.auditLog.deleteMany({ where: { actorId: userId } });

      // Delete sessions (better-auth session table)
      await tx.session.deleteMany({ where: { userId } });

      // Delete accounts (OAuth accounts linked to this user)
      await tx.account.deleteMany({ where: { userId } });

      // Finally delete the user
      await tx.user.delete({ where: { id: userId } });
    }, {
      timeout: 15000
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/profile error:", err);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR" } }, { status: 500 });
  }
}
