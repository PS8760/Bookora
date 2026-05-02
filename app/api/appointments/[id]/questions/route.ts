import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/prisma/prisma";

export const dynamic = "force-dynamic";

// GET /api/appointments/:id/questions — list questions for a service
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      );
    }

    const { id } = await params;

    const service = await prisma.service.findUnique({
      where: { id, deletedAt: null },
      select: { id: true, organiserId: true, isPublished: true },
    });

    if (!service) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Service not found" } },
        { status: 404 }
      );
    }

    const role = (session.user as { role?: string }).role ?? "customer";

    if (role === "organiser" && service.organiserId !== session.user.id) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Access denied" } },
        { status: 403 }
      );
    }

    const questions = await prisma.question.findMany({
      where: { serviceId: id },
      include: { options: { orderBy: { order: "asc" } } },
      orderBy: { order: "asc" },
    });

    return NextResponse.json({ data: questions });
  } catch (error) {
    console.error("GET /api/appointments/:id/questions error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch questions" } },
      { status: 500 }
    );
  }
}

// POST /api/appointments/:id/questions — add a question to a service
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

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
    const body = await request.json();
    const { text, type, required, options } = body;

    if (!text || !type) {
      return NextResponse.json(
        { error: { code: "INVALID_INPUT", message: "text and type are required" } },
        { status: 400 }
      );
    }

    const validTypes = ["TEXT", "MULTIPLE_CHOICE", "BOOLEAN", "NUMBER"];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: { code: "INVALID_INPUT", message: `type must be one of: ${validTypes.join(", ")}` } },
        { status: 400 }
      );
    }

    if (type === "MULTIPLE_CHOICE" && (!options || !Array.isArray(options) || options.length === 0)) {
      return NextResponse.json(
        { error: { code: "INVALID_INPUT", message: "options array is required for MULTIPLE_CHOICE questions" } },
        { status: 400 }
      );
    }

    const service = await prisma.service.findUnique({
      where: { id, deletedAt: null },
      select: { id: true, organiserId: true },
    });

    if (!service) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Service not found" } },
        { status: 404 }
      );
    }

    if (role === "organiser" && service.organiserId !== session.user.id) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Access denied" } },
        { status: 403 }
      );
    }

    // Determine next order value
    const lastQuestion = await prisma.question.findFirst({
      where: { serviceId: id },
      orderBy: { order: "desc" },
      select: { order: true },
    });
    const nextOrder = (lastQuestion?.order ?? -1) + 1;

    const question = await prisma.question.create({
      data: {
        serviceId: id,
        text,
        type,
        required: required ?? false,
        order: nextOrder,
        ...(type === "MULTIPLE_CHOICE" && options
          ? {
              options: {
                create: (options as string[]).map((label, idx) => ({
                  label,
                  order: idx,
                })),
              },
            }
          : {}),
      },
      include: { options: { orderBy: { order: "asc" } } },
    });

    return NextResponse.json({ data: question }, { status: 201 });
  } catch (error) {
    console.error("POST /api/appointments/:id/questions error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to create question" } },
      { status: 500 }
    );
  }
}
