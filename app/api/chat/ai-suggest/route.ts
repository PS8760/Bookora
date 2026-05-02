import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/prisma/prisma";
import { generateChatReply } from "@/lib/groq";

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
    }

    const { chatId } = await request.json();
    if (!chatId) return NextResponse.json({ error: { code: "INVALID_INPUT" } }, { status: 400 });

    const currentUserId = session.user.id;

    // Get last 5 messages for context
    const messages = await prisma.message.findMany({
      where: { conversationId: chatId },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    if (messages.length === 0) {
      return NextResponse.json({ data: "How can I help you today?" });
    }

    const context = messages.reverse().map((m) => ({
      role: m.senderId === currentUserId ? ("assistant" as const) : ("user" as const),
      content: m.content,
    }));

    const suggestion = await generateChatReply(context);

    return NextResponse.json({ data: suggestion });
  } catch (error) {
    console.error("POST /api/chat/ai-suggest error:", error);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR" } }, { status: 500 });
  }
}
