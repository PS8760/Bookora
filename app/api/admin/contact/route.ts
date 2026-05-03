import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/prisma/prisma";
import { sendNotification } from "@/lib/notifications";

export const dynamic = "force-dynamic";

// POST /api/admin/contact — Send a message to admin
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
    const { subject, message, category } = body;

    if (!subject || !message) {
      return NextResponse.json(
        { error: { code: "INVALID_INPUT", message: "Subject and message are required" } },
        { status: 400 }
      );
    }

    // Get all admin users
    const admins = await prisma.user.findMany({
      where: {
        role: "admin",
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    if (admins.length === 0) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "No admin users found" } },
        { status: 404 }
      );
    }

    // Send notification to all admins
    const notificationPromises = admins.map((admin) =>
      sendNotification({
        userId: admin.id,
        subject: `${category ? `[${category}] ` : ""}${subject}`,
        body: `From: ${session.user.name} (${session.user.email})\n\n${message}`,
        channels: ["PUSH", "EMAIL"],
      })
    );

    await Promise.all(notificationPromises);

    // Also create a conversation for each admin
    const conversationPromises = admins.map(async (admin) => {
      // Find or create conversation
      let conversation = await prisma.conversation.findFirst({
        where: {
          type: "SUPPORT",
          participants: {
            every: {
              userId: {
                in: [session.user.id, admin.id],
              },
            },
          },
        },
      });

      if (!conversation) {
        conversation = await prisma.conversation.create({
          data: {
            type: "SUPPORT",
            participants: {
              create: [
                { userId: session.user.id },
                { userId: admin.id },
              ],
            },
          },
        });
      }

      // Create message
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderId: session.user.id,
          content: `**${subject}**\n\n${message}`,
        },
      });

      // Update conversation timestamp
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { updatedAt: new Date() },
      });

      return conversation;
    });

    await Promise.all(conversationPromises);

    return NextResponse.json({
      message: "Message sent to admin successfully",
      adminCount: admins.length,
    });
  } catch (error) {
    console.error("POST /api/admin/contact error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to send message" } },
      { status: 500 }
    );
  }
}
