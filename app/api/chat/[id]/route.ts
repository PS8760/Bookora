import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/prisma/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
    }

    const { id: chatId } = await params;
    const currentUserId = session.user.id;

    // Verify participation
    const participant = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId: chatId,
          userId: currentUserId,
        },
      },
    });

    if (!participant && session.user.role !== "admin") {
      return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
    }

    const messages = await prisma.message.findMany({
      where: { conversationId: chatId },
      include: {
        sender: { select: { id: true, name: true, image: true, role: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    // Update last read
    if (participant) {
      await prisma.conversationParticipant.update({
        where: { id: participant.id },
        data: { lastReadAt: new Date() },
      });
    }

    return NextResponse.json({ data: messages });
  } catch (error) {
    console.error("GET /api/chat/[id] error:", error);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR" } }, { status: 500 });
  }
}
