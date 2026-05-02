import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const ROLE_DASHBOARD: Record<string, string> = {
  admin: "/admin",
  organiser: "/organiser",
  customer: "/dashboard",
};

/**
 * GET /api/auth/redirect
 * Resolves the user's role from the session and redirects to the
 * appropriate dashboard. Used by middleware when an authenticated user
 * tries to access an auth page (login, register, etc.).
 */
export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session?.user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const role = (session.user as { role?: string }).role ?? "customer";
  const destination = ROLE_DASHBOARD[role] ?? "/dashboard";

  return NextResponse.redirect(new URL(destination, request.url));
}
