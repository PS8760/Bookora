import { NextRequest, NextResponse } from "next/server";
import prisma from "@/prisma/prisma";
import { getAvailableSlots } from "@/lib/slots";
import { getCachedSlots, setCachedSlots } from "@/lib/slot-cache";
import { getSessionWithRole } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * GET /api/appointments/:id/slots?date=YYYY-MM-DD
 *
 * Returns available time slots for a given date.
 *
 * Real-time improvements:
 * - In-process cache with 4s TTL reduces DB load under concurrent polling
 * - ETag + 304 Not Modified: browser skips JSON parsing when nothing changed
 * - Cache-Control: no-cache (revalidate every request, but use 304 when unchanged)
 * - On-demand slot generation if no slots exist for the requested date
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionWithRole(request);

    if (!user) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      );
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const date       = searchParams.get("date");
    const resourceId = searchParams.get("resourceId") ?? undefined;
    const shareToken = searchParams.get("share") ?? undefined;

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: { code: "INVALID_INPUT", message: "date parameter is required (YYYY-MM-DD)" } },
        { status: 400 }
      );
    }

    const role = user.role;

    // Permission check — single DB query
    const service = await prisma.service.findFirst({
      where: { id, deletedAt: null },
      select: { isPublished: true, organiserId: true, shareToken: true },
    });

    if (!service) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Service not found" } },
        { status: 404 }
      );
    }

    if (role === "customer") {
      const hasShareAccess = shareToken && shareToken === service.shareToken;
      if (!service.isPublished && !hasShareAccess) {
        return NextResponse.json(
          { error: { code: "FORBIDDEN", message: "Service not published" } },
          { status: 403 }
        );
      }
    } else if (role === "organiser" && service.organiserId !== user.userId) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Access denied" } },
        { status: 403 }
      );
    }

    // ── Cache check ────────────────────────────────────────────────────────────
    const cached = getCachedSlots(id, date, resourceId);
    const clientETag = request.headers.get("if-none-match");

    if (cached) {
      // Return 304 if client already has the current version
      if (clientETag && clientETag === cached.etag) {
        return new NextResponse(null, {
          status: 304,
          headers: {
            ETag:          cached.etag,
            "Cache-Control": "no-cache",
          },
        });
      }

      return NextResponse.json(
        { data: formatSlots(cached.slots) },
        {
          headers: {
            ETag:          cached.etag,
            "Cache-Control": "no-cache",
            "X-Cache":     "HIT",
          },
        }
      );
    }

    // ── DB fetch (with on-demand generation) ──────────────────────────────────
    const slots = await getAvailableSlots(id, date, resourceId);
    const etag  = setCachedSlots(id, date, slots, resourceId);

    // 304 check against freshly computed ETag
    if (clientETag && clientETag === etag) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag:          etag,
          "Cache-Control": "no-cache",
        },
      });
    }

    return NextResponse.json(
      { data: formatSlots(slots) },
      {
        headers: {
          ETag:          etag,
          "Cache-Control": "no-cache",
          "X-Cache":     "MISS",
        },
      }
    );
  } catch (error) {
    console.error("GET /api/appointments/:id/slots error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch slots" } },
      { status: 500 }
    );
  }
}

function formatSlots(slots: ReturnType<typeof Array.prototype.map extends never ? never : any>) {
  return slots.map((slot: any) => ({
    id:                slot.id,
    time:              new Date(slot.startUtc).toLocaleTimeString("en-US", {
                         hour: "2-digit",
                         minute: "2-digit",
                         hour12: true,
                       }),
    startUtc:          slot.startUtc,
    endUtc:            slot.endUtc,
    available:         true,
    remainingCapacity: slot.remaining,
    maxCapacity:       slot.maxCapacity,
    version:           slot.version,
    providerId:        slot.providerId,
    providerName:      slot.providerName,
  }));
}
