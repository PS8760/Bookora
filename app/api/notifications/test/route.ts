import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/prisma/prisma";

export const dynamic = "force-dynamic";

// POST /api/notifications/test — Create a test notification (for testing purposes)
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { type, title, message } = body;

    // Create a test notification
    const notification = await prisma.notification.create({
      data: {
        userId: session.user.id,
        channel: "PUSH",
        subject: title || "Test Notification",
        body: message || "This is a test notification to verify the notification system is working correctly.",
        status: "QUEUED",
      },
    });

    return NextResponse.json({
      data: notification,
      message: "Test notification created successfully",
    });
  } catch (error) {
    console.error("POST /api/notifications/test error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to create test notification" } },
      { status: 500 }
    );
  }
}
