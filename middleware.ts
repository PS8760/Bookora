import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

// Routes that require authentication
const PROTECTED_ROUTES = ["/dashboard", "/organiser", "/admin", "/book"];

// Routes only accessible when NOT authenticated
const AUTH_ROUTES = ["/login", "/register", "/verify-otp", "/forgot-password"];

// Role → home dashboard mapping
const ROLE_DASHBOARD: Record<string, string> = {
  admin: "/admin",
  organiser: "/organiser",
  customer: "/dashboard",
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check for a session cookie (fast, no DB hit)
  const sessionCookie = getSessionCookie(request);
  const isAuthenticated = !!sessionCookie;

  // ── Redirect logged-in users away from auth pages ──────────────────────────
  if (isAuthenticated && AUTH_ROUTES.some((r) => pathname.startsWith(r))) {
    // We don't know the role here without a DB call, so send to /api/auth/redirect
    // which will resolve the role and bounce to the right dashboard.
    return NextResponse.redirect(new URL("/api/auth/redirect", request.url));
  }

  // ── Redirect unauthenticated users away from protected pages ───────────────
  if (!isAuthenticated && PROTECTED_ROUTES.some((r) => pathname.startsWith(r))) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── Role-based access control for protected sections ───────────────────────
  // We only enforce this when a session exists. The actual role check is done
  // server-side in the API route; here we guard the page routes.
  if (isAuthenticated && PROTECTED_ROUTES.some((r) => pathname.startsWith(r))) {
    // /admin pages — only admin role
    if (pathname.startsWith("/admin")) {
      const res = await fetch(new URL("/api/auth/session-role", request.url), {
        headers: { cookie: request.headers.get("cookie") ?? "" },
      });
      if (res.ok) {
        const { role } = await res.json();
        if (role !== "admin") {
          return NextResponse.redirect(
            new URL(ROLE_DASHBOARD[role] ?? "/dashboard", request.url)
          );
        }
      }
    }

    // /organiser pages — only organiser or admin role
    if (pathname.startsWith("/organiser")) {
      const res = await fetch(new URL("/api/auth/session-role", request.url), {
        headers: { cookie: request.headers.get("cookie") ?? "" },
      });
      if (res.ok) {
        const { role } = await res.json();
        if (role !== "organiser" && role !== "admin") {
          return NextResponse.redirect(
            new URL(ROLE_DASHBOARD[role] ?? "/dashboard", request.url)
          );
        }
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static, _next/image (Next.js internals)
     * - favicon.ico
     * - public assets
     * - /api/auth/* (better-auth endpoints must be unrestricted)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp)|api/auth).*)",
  ],
};
