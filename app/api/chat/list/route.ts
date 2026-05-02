import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/prisma/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
    }

    const currentUserId = session.user.id;

    const conversations = await prisma.conversation.findMany({
      where: {
        participants: { some: { userId: currentUserId } },
      },
      include: {
        participants: {
          include: { user: { select: { id: true, name: true, image: true, role: true } } },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        booking: {
          include: { service: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ data: conversations });
  } catch (error) {
    console.error("GET /api/chat/list error:", error);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR" } }, { status: 500 });
  }
}
