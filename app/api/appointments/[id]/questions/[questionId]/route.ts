import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/prisma/prisma";

export const dynamic = "force-dynamic";

// PATCH /api/appointments/:id/questions/:questionId — update a question
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; questionId: string }> }
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

    const { id, questionId } = await params;
    const body = await request.json();
    const { text, type, required, order, options } = body;

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

    const existingQuestion = await prisma.question.findFirst({
      where: { id: questionId, serviceId: id },
    });

    if (!existingQuestion) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Question not found" } },
        { status: 404 }
      );
    }

    if (type) {
      const validTypes = ["TEXT", "MULTIPLE_CHOICE", "BOOLEAN", "NUMBER"];
      if (!validTypes.includes(type)) {
        return NextResponse.json(
          { error: { code: "INVALID_INPUT", message: `type must be one of: ${validTypes.join(", ")}` } },
          { status: 400 }
        );
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {};
    if (text !== undefined) updateData.text = text;
    if (type !== undefined) updateData.type = type;
    if (required !== undefined) updateData.required = required;
    if (order !== undefined) updateData.order = order;

    // If options provided, replace them
    if (options !== undefined && Array.isArray(options)) {
      updateData.options = {
        deleteMany: {},
        create: (options as string[]).map((label, idx) => ({ label, order: idx })),
      };
    }

    const updated = await prisma.question.update({
      where: { id: questionId },
      data: updateData,
      include: { options: { orderBy: { order: "asc" } } },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("PATCH /api/appointments/:id/questions/:questionId error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to update question" } },
      { status: 500 }
    );
  }
}

// DELETE /api/appointments/:id/questions/:questionId — delete a question
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; questionId: string }> }
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

    const { id, questionId } = await params;

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

    const existingQuestion = await prisma.question.findFirst({
      where: { id: questionId, serviceId: id },
    });

    if (!existingQuestion) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Question not found" } },
        { status: 404 }
      );
    }

    await prisma.question.delete({ where: { id: questionId } });

    return NextResponse.json({ message: "Question deleted successfully" });
  } catch (error) {
    console.error("DELETE /api/appointments/:id/questions/:questionId error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to delete question" } },
      { status: 500 }
    );
  }
}
