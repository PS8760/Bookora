import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { auth } from "@/lib/auth";
import prisma from "@/prisma/prisma";

export const dynamic = "force-dynamic";

type SessionUser = {
  id: string;
  role?: string;
  name?: string;
  email?: string;
};

const ACTIVE_STATUSES = ["PENDING", "CONFIRMED"] as const;

function getRole(user: SessionUser) {
  return user.role ?? "customer";
}

// GET /api/bookings - List bookings for organisers/admins.
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      );
    }

    const user = session.user as SessionUser;
    const role = getRole(user);
    if (role === "customer") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Use /api/bookings/me instead" } },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "20", 10), 1), 100);
    const skip = (page - 1) * limit;

    const where = {
      ...(status ? { status: status.toUpperCase() as "PENDING" | "CONFIRMED" | "CANCELLED" | "RESCHEDULED" | "COMPLETED" | "NO_SHOW" } : {}),
      ...(role === "organiser" ? { service: { organiserId: user.id } } : {}),
    };

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: {
          service: { include: { organiser: { select: { id: true, name: true, email: true } } } },
          providerSlot: true,
          customer: { select: { id: true, name: true, email: true, image: true } },
          provider: { select: { id: true, name: true, email: true, image: true } },
          resource: true,
          payments: { orderBy: { createdAt: "desc" }, take: 1 },
          answers: { include: { question: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.booking.count({ where }),
    ]);

    return NextResponse.json({
      data: bookings,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("GET /api/bookings error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to list bookings" } },
      { status: 500 }
    );
  }
}

// POST /api/bookings - Create a booking with atomic capacity control.
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      );
    }

    const user = session.user as SessionUser;
    if (getRole(user) !== "customer") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Only customers can book appointments" } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const slotId = String(body.slotId ?? "");
    const serviceId = String(body.appointmentId ?? body.serviceId ?? "");
    const capacityRequested = Math.max(Number(body.capacityRequested ?? 1), 1);
    const idempotencyKey = String(body.idempotencyKey ?? randomUUID());
    const formAnswers = body.formAnswers ?? {};
    const questionAnswers = Array.isArray(body.questionAnswers) ? body.questionAnswers : [];

    if (!slotId || !serviceId) {
      return NextResponse.json(
        { error: { code: "INVALID_INPUT", message: "Missing slot or appointment" } },
        { status: 400 }
      );
    }

    const existingBooking = await prisma.booking.findFirst({
      where: {
        customerId: user.id,
        providerSlotId: slotId,
        status: { in: [...ACTIVE_STATUSES] },
      },
      include: { providerSlot: true, service: true, payments: true },
    });

    if (existingBooking) {
      return NextResponse.json({ data: existingBooking, message: "Booking already exists" });
    }

    const result = await prisma.$transaction(async (tx) => {
      const slot = await tx.providerSlot.findFirst({
        where: { id: slotId, serviceId, isActive: true },
        include: {
          service: {
            include: {
              organiser: { select: { id: true, name: true, email: true } },
              questions: { include: { options: true }, orderBy: { order: "asc" } },
            },
          },
          user: { select: { id: true, name: true, email: true } },
          resource: true,
        },
      });

      if (!slot) throw new Error("SLOT_NOT_FOUND");
      if (!slot.service.isPublished) throw new Error("APPOINTMENT_NOT_PUBLISHED");
      if (slot.startTime <= new Date()) throw new Error("SLOT_PAST");
      if (capacityRequested > slot.capacity - slot.booked) throw new Error("CAPACITY_EXCEEDED");

      for (const question of slot.service.questions) {
        const answer = questionAnswers.find((item: { questionId?: string }) => item.questionId === question.id);
        if (question.required && (!answer || (!answer.answerText && !answer.selectedOptionId))) {
          throw new Error("REQUIRED_QUESTIONS_MISSING");
        }
        if (answer?.selectedOptionId) {
          const validOption = question.options.some((option) => option.id === answer.selectedOptionId);
          if (!validOption) throw new Error("INVALID_QUESTION_OPTION");
        }
      }

      const capacityUpdate = await tx.providerSlot.updateMany({
        where: {
          id: slotId,
          isActive: true,
          booked: { lte: slot.capacity - capacityRequested },
        },
        data: {
          booked: { increment: capacityRequested },
          version: { increment: 1 },
        },
      });

      if (capacityUpdate.count !== 1) throw new Error("CAPACITY_EXCEEDED");

      const status = slot.service.manualConfirm ? "PENDING" : "CONFIRMED";
      const paymentStatus = slot.service.advancePayment ? "PENDING" : "UNPAID";

      const booking = await tx.booking.create({
        data: {
          customerId: user.id,
          serviceId,
          providerSlotId: slotId,
          userId: slot.userId,
          resourceId: slot.resourceId,
          status,
          paymentStatus,
          confirmedAt: status === "CONFIRMED" ? new Date() : null,
          notes: JSON.stringify({
            phone: formAnswers.phone ?? null,
            notes: formAnswers.notes ?? null,
            capacityRequested,
          }),
          payments: slot.service.advancePayment && slot.service.paymentAmount
            ? {
                create: {
                  amount: slot.service.paymentAmount,
                  currency: slot.service.currency,
                  status: "PENDING",
                  gatewayProvider: "razorpay",
                  idempotencyKey,
                },
              }
            : undefined,
          auditLogs: {
            create: {
              actorId: user.id,
              action: "CREATED",
              metadata: {
                idempotencyKey,
                capacityRequested,
                customerSnapshot: {
                  name: formAnswers.name ?? user.name ?? null,
                  email: formAnswers.email ?? user.email ?? null,
                },
              },
              ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
              userAgent: request.headers.get("user-agent") ?? undefined,
            },
          },
          notifications: {
            create: [
              {
                userId: user.id,
                channel: "EMAIL",
                subject: status === "CONFIRMED" ? "Booking confirmed" : "Booking request received",
                body: `Your booking for ${slot.service.title} is ${status === "CONFIRMED" ? "confirmed" : "pending confirmation"}.`,
              },
              {
                userId: slot.service.organiserId,
                channel: "EMAIL",
                subject: "New booking",
                body: `${formAnswers.name ?? user.name ?? "A customer"} booked ${slot.service.title}.`,
              },
            ],
          },
          answers: questionAnswers.length > 0
            ? {
                create: questionAnswers
                  .filter((answer: { questionId?: string; answerText?: string; selectedOptionId?: string }) => answer.questionId)
                  .map((answer: { questionId: string; answerText?: string; selectedOptionId?: string }) => ({
                    questionId: answer.questionId,
                    answerText: answer.answerText ?? null,
                    selectedOptionId: answer.selectedOptionId ?? null,
                  })),
              }
            : undefined,
        },
        include: {
          providerSlot: true,
          service: { include: { organiser: { select: { id: true, name: true, email: true } } } },
          customer: { select: { id: true, name: true, email: true } },
          provider: { select: { id: true, name: true, email: true } },
          resource: true,
          payments: true,
        },
      });

      return booking;
    });

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "INTERNAL_ERROR";
    console.error("POST /api/bookings error:", error);

    const statusByCode: Record<string, number> = {
      SLOT_NOT_FOUND: 404,
      APPOINTMENT_NOT_PUBLISHED: 403,
      SLOT_PAST: 409,
      CAPACITY_EXCEEDED: 409,
      REQUIRED_QUESTIONS_MISSING: 400,
      INVALID_QUESTION_OPTION: 400,
    };

    const messageByCode: Record<string, string> = {
      SLOT_NOT_FOUND: "Slot not found",
      APPOINTMENT_NOT_PUBLISHED: "Appointment not published",
      SLOT_PAST: "Cannot book past slots",
      CAPACITY_EXCEEDED: "Slot capacity exceeded",
      REQUIRED_QUESTIONS_MISSING: "Please answer all required questions",
      INVALID_QUESTION_OPTION: "Invalid answer selected",
    };

    return NextResponse.json(
      {
        error: {
          code: statusByCode[message] ? message : "INTERNAL_ERROR",
          message: messageByCode[message] ?? "Failed to create booking",
        },
      },
      { status: statusByCode[message] ?? 500 }
    );
  }
}
