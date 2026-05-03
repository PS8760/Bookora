import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/prisma/prisma";

/**
 * GET /api/auth/session-role
 * Returns the role of the currently authenticated user, read directly
 * from the DB. Used by middleware for role-based route protection.
 * (better-auth session may not include additionalFields like `role`.)
 */
export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  // Read role from DB — not from session.user which may be missing additionalFields
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  const role = dbUser?.role ?? "customer";
  return NextResponse.json({ role });
}
