import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/prisma/prisma";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

// GET /api/appointments/:id/share-link - Generate or get share link
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      );
    }

    const role = (session.user as { role?: string }).role ?? "customer";
    if (!["organiser", "admin"].includes(role)) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Insufficient permissions" } },
        { status: 403 }
      );
    }

    const { id } = await params;

    const appointment = await prisma.service.findFirst({
      where: { id, deletedAt: null },
    });

    if (!appointment) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Appointment not found" } },
        { status: 404 }
      );
    }

    if (role === "organiser" && appointment.organiserId !== session.user.id) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Access denied" } },
        { status: 403 }
      );
    }

    if (appointment.shareToken) {
      const shareUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/book/${appointment.id}?share=${appointment.shareToken}`;
      return NextResponse.json({
        data: {
          shareToken: appointment.shareToken,
          shareUrl,
        },
        message: "Existing share link retrieved",
      });
    }

    // Generate new token
    const shareToken = randomUUID();

    await prisma.service.update({
      where: { id },
      data: {
        shareToken,
      },
    });

    const shareUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/book/${id}?share=${shareToken}`;

    return NextResponse.json({
      data: {
        shareToken,
        shareUrl,
      },
      message: "Share link generated successfully",
    });
  } catch (error) {
    console.error("Error generating share link:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to generate share link" } },
      { status: 500 }
    );
  }
}

// DELETE /api/appointments/:id/share-link - Invalidate share link
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      );
    }

    const role = (session.user as { role?: string }).role ?? "customer";
    if (!["organiser", "admin"].includes(role)) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Insufficient permissions" } },
        { status: 403 }
      );
    }

    const { id } = await params;

    const appointment = await prisma.service.findFirst({
      where: { id, deletedAt: null },
    });

    if (!appointment) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Appointment not found" } },
        { status: 404 }
      );
    }

    if (role === "organiser" && appointment.organiserId !== session.user.id) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Access denied" } },
        { status: 403 }
      );
    }

    await prisma.service.update({
      where: { id },
      data: {
        shareToken: null,
      },
    });

    return NextResponse.json({
      message: "Share link invalidated successfully",
    });
  } catch (error) {
    console.error("Error invalidating share link:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to invalidate share link" } },
      { status: 500 }
    );
  }
}
