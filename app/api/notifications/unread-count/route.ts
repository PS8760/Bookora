import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUnreadCount } from "@/lib/notifications";

export const dynamic = "force-dynamic";

// GET /api/notifications/unread-count — Get unread notification count
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      );
    }

    const count = await getUnreadCount(session.user.id);

    return NextResponse.json({ count });
  } catch (error) {
    console.error("GET /api/notifications/unread-count error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch unread count" } },
      { status: 500 }
    );
  }
}
