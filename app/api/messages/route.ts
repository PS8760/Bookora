import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/prisma/prisma";
import { sendNotification, NotificationTemplates } from "@/lib/notifications";

export const dynamic = "force-dynamic";

// GET /api/messages — Get messages for current user
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get("conversationId");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, parseInt(searchParams.get("limit") || "50"));
    const skip = (page - 1) * limit;

    // Get user's conversations
    const conversations = await prisma.conversation.findMany({
      where: {
        participants: {
          some: {
            userId: session.user.id,
          },
        },
        ...(conversationId ? { id: conversationId } : {}),
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
                role: true,
              },
            },
          },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: conversationId ? limit : 1, // Get all messages if specific conversation, else just latest
          skip: conversationId ? skip : 0,
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
        },
        booking: {
          select: {
            id: true,
            service: {
              select: {
                title: true,
              },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({
      data: conversations,
      pagination: { page, limit, total: conversations.length },
    });
  } catch (error) {
    console.error("GET /api/messages error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch messages" } },
      { status: 500 }
    );
  }
}

// POST /api/messages — Send a message
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { recipientId, content, type, bookingId } = body;

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: { code: "INVALID_INPUT", message: "Message content is required" } },
        { status: 400 }
      );
    }

    // Find or create conversation
    let conversation = await prisma.conversation.findFirst({
      where: {
        type: type || "DIRECT",
        ...(bookingId ? { bookingId } : {}),
        participants: {
          every: {
            userId: {
              in: [session.user.id, recipientId],
            },
          },
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
        },
      },
    });

    // Create conversation if it doesn't exist
    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          type: type || "DIRECT",
          ...(bookingId ? { bookingId } : {}),
          participants: {
            create: [
              { userId: session.user.id },
              { userId: recipientId },
            ],
          },
        },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true,
                },
              },
            },
          },
        },
      });
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId: session.user.id,
        content: content.trim(),
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });

    // Update conversation timestamp
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });

    // Get recipient info
    const recipient = conversation.participants.find(
      (p) => p.userId === recipientId
    );

    if (recipient) {
      // Send notification to recipient
      await sendNotification({
        userId: recipientId,
        subject: `New message from ${session.user.name}`,
        body: content.length > 100 ? `${content.substring(0, 100)}...` : content,
        channels: ["PUSH", "EMAIL"],
      });
    }

    return NextResponse.json({
      data: {
        message,
        conversation,
      },
    });
  } catch (error) {
    console.error("POST /api/messages error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to send message" } },
      { status: 500 }
    );
  }
}
