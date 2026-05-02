import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/**
 * GET /api/auth/session-role
 * Returns the role of the currently authenticated user.
 * Used by middleware for lightweight role checks.
 */
export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const role = (session.user as { role?: string }).role ?? "customer";
  return NextResponse.json({ role });
}
