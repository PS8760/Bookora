import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/prisma/prisma";

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
    }

    const { conversationId, bookingId, receiverId, content, type = "DIRECT" } = await request.json();

    if (!content) {
      return NextResponse.json({ error: { code: "INVALID_INPUT", message: "Message content required" } }, { status: 400 });
    }

    const currentUserId = session.user.id;

    let chatId = conversationId;

    // If no conversationId but bookingId is provided, find or create booking-based conversation
    if (!chatId && bookingId) {
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: { service: true },
      });

      if (!booking) {
        return NextResponse.json({ error: { code: "NOT_FOUND", message: "Booking not found" } }, { status: 404 });
      }

      // Find existing conversation for this booking
      const existing = await prisma.conversation.findFirst({
        where: { bookingId, type: "BOOKING" },
      });

      if (existing) {
        chatId = existing.id;
      } else {
        // Create new conversation
        const conversation = await prisma.conversation.create({
          data: {
            type: "BOOKING",
            bookingId,
            participants: {
              create: [
                { userId: booking.customerId },
                { userId: booking.service.organiserId },
              ],
            },
          },
        });
        chatId = conversation.id;
      }
    }

    // Direct chat between users (e.g. Admin & User)
    if (!chatId && receiverId) {
      // Find existing direct chat
      const existing = await prisma.conversation.findFirst({
        where: {
          type: "DIRECT",
          participants: { every: { userId: { in: [currentUserId, receiverId] } } },
        },
      });

      if (existing) {
        chatId = existing.id;
      } else {
        const conversation = await prisma.conversation.create({
          data: {
            type: "DIRECT",
            participants: {
              create: [
                { userId: currentUserId },
                { userId: receiverId },
              ],
            },
          },
        });
        chatId = conversation.id;
      }
    }

    if (!chatId) {
      return NextResponse.json({ error: { code: "INVALID_INPUT", message: "Could not determine conversation" } }, { status: 400 });
    }

    // Create the message
    const message = await prisma.message.create({
      data: {
        conversationId: chatId,
        senderId: currentUserId,
        content,
      },
      include: {
        sender: { select: { id: true, name: true, image: true } },
      },
    });

    // Update conversation updatedAt
    await prisma.conversation.update({
      where: { id: chatId },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({ data: message });
  } catch (error) {
    console.error("POST /api/chat/send error:", error);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR" } }, { status: 500 });
  }
}
