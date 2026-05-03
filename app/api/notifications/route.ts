import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getInAppNotifications, getUnreadCount } from "@/lib/notifications";

export const dynamic = "force-dynamic";

// GET /api/notifications — Get user's notifications
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(100, parseInt(searchParams.get("limit") || "50"));
    const unreadOnly = searchParams.get("unreadOnly") === "true";

    const [notifications, unreadCount] = await Promise.all([
      getInAppNotifications(session.user.id, { limit, unreadOnly }),
      getUnreadCount(session.user.id),
    ]);

    return NextResponse.json({
      data: notifications,
      unreadCount,
    });
  } catch (error) {
    console.error("GET /api/notifications error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch notifications" } },
      { status: 500 }
    );
  }
}
