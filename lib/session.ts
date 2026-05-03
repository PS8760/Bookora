import { auth } from "@/lib/auth";
import prisma from "@/prisma/prisma";
import type { NextRequest } from "next/server";

/**
 * Get the authenticated user's role directly from the DB.
 *
 * IMPORTANT: better-auth does NOT reliably hydrate `additionalFields`
 * (like `role`) into the session.user object. Reading session.user.role
 * always returns undefined for OAuth logins, causing every role check
 * to silently fall back to "customer".
 *
 * This helper always reads from Prisma — the single source of truth.
 *
 * Returns { userId, role } on success, or null if unauthenticated.
 */
export async function getSessionWithRole(
  request: NextRequest
): Promise<{ userId: string; role: string; name: string; email: string; image?: string | null } | null> {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) return null;

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, name: true, email: true, image: true },
  });

  if (!dbUser) return null;

  return {
    userId: dbUser.id,
    role: dbUser.role ?? "customer",
    name: dbUser.name ?? session.user.name ?? "",
    email: dbUser.email ?? session.user.email ?? "",
    image: dbUser.image ?? session.user.image,
  };
}
