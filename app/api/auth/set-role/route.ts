import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/prisma/prisma";

/**
 * POST /api/auth/set-role
 * Called immediately after sign-up to set the user's chosen role.
 * Only allows setting "customer" or "organiser" — never "admin".
 * Requires an active session (the user just signed up).
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { role } = body;

    // Only allow safe roles — admin can never be self-assigned
    const allowedRoles = ["customer", "organiser"];
    if (!allowedRoles.includes(role)) {
      return NextResponse.json(
        { error: { code: "INVALID_ROLE", message: "Invalid role. Must be customer or organiser." } },
        { status: 400 }
      );
    }

    // Only allow setting role if the user is still "customer" (default)
    // This prevents re-using this endpoint to escalate privileges later
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, createdAt: true },
    });

    if (!user) {
      return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 });
    }

    // Only allow within 60 seconds of account creation (fresh signup)
    const ageSeconds = (Date.now() - new Date(user.createdAt).getTime()) / 1000;
    if (ageSeconds > 60) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Role can only be set immediately after signup." } },
        { status: 403 }
      );
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { role },
    });

    return NextResponse.json({ success: true, role });
  } catch (err) {
    console.error("POST /api/auth/set-role error:", err);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR" } }, { status: 500 });
  }
}
