import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/prisma/prisma";

export const dynamic = "force-dynamic";

// GET /api/admin/notifications-debug — Debug endpoint for notifications
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      );
    }

    // Fetch all admin users
    const admins = await prisma.user.findMany({
      where: {
        role: "admin",
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    // Fetch recent notifications (last 20)
    const notifications = await prisma.notification.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 20,
      select: {
        id: true,
        userId: true,
        channel: true,
        status: true,
        subject: true,
        body: true,
        createdAt: true,
        sentAt: true,
      },
    });

    return NextResponse.json({
      admins,
      notifications,
      currentUser: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        role: (session.user as any).role,
      },
    });
  } catch (error) {
    console.error("GET /api/admin/notifications-debug error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch debug data" } },
      { status: 500 }
    );
  }
}
