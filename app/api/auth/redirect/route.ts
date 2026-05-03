import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/prisma/prisma";

const ROLE_DASHBOARD: Record<string, string> = {
  admin: "/admin",
  organiser: "/organiser",
  customer: "/dashboard",
};

const ALLOWED_ROLES = ["customer", "organiser"]; // admin cannot be self-assigned

/**
 * GET /api/auth/redirect
 *
 * Reads the user's role DIRECTLY from the DB (not the session object).
 * better-auth does not reliably hydrate `additionalFields` like `role`
 * into the session — reading session.user.role is always undefined for
 * OAuth logins, causing everyone to land on /dashboard.
 *
 * Also handles the social sign-up flow: if the register page set a
 * `pending-role` cookie before the OAuth redirect, we apply that role
 * to a freshly-created user (account age < 60 s) before routing them.
 */
export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // --- Handle pending-role cookie (set by register page's social sign-up) ---
  const pendingRole = request.cookies.get("pending-role")?.value;

  if (pendingRole && ALLOWED_ROLES.includes(pendingRole)) {
    // Only apply if this is a brand-new account (< 60 seconds old)
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, createdAt: true },
    });

    if (dbUser) {
      const ageSeconds = (Date.now() - new Date(dbUser.createdAt).getTime()) / 1000;
      if (ageSeconds < 60 && dbUser.role === "customer" && pendingRole !== "customer") {
        // Apply the chosen role to the new user
        await prisma.user.update({
          where: { id: session.user.id },
          data: { role: pendingRole },
        });
      }
    }
  }

  // --- Read the final role from DB (always authoritative) ---
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  const role = dbUser?.role ?? "customer";
  const destination = ROLE_DASHBOARD[role] ?? "/dashboard";

  // Clear the pending-role cookie
  const response = NextResponse.redirect(new URL(destination, request.url));
  response.cookies.set("pending-role", "", { maxAge: 0, path: "/" });

  return response;
}
