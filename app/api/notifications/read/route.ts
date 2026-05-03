import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { markNotificationsAsRead } from "@/lib/notifications";

export const dynamic = "force-dynamic";

// POST /api/notifications/read — Mark notifications as read
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
    const { notificationIds } = body; // Optional: array of IDs, or undefined to mark all as read

    await markNotificationsAsRead(session.user.id, notificationIds);

    return NextResponse.json({ message: "Notifications marked as read" });
  } catch (error) {
    console.error("POST /api/notifications/read error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to mark notifications as read" } },
      { status: 500 }
    );
  }
}
