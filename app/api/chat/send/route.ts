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

      // Security Check: Only customer or organiser of this booking can chat
      if (booking.customerId !== currentUserId && booking.service.organiserId !== currentUserId) {
         // Admins can also join booking chats? Yes, usually for moderation.
         const currentUser = await prisma.user.findUnique({ where: { id: currentUserId } });
         if (currentUser?.role !== "admin") {
           return NextResponse.json({ error: { code: "FORBIDDEN", message: "You are not a participant in this booking" } }, { status: 403 });
         }
      }

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
      let targetId = receiverId;

      // Special case: find first admin if receiverId is "admin"
      if (receiverId === "admin") {
        const adminUser = await prisma.user.findFirst({ where: { role: "admin" } });
        if (!adminUser) {
          return NextResponse.json({ error: { code: "NOT_FOUND", message: "No administrator found" } }, { status: 404 });
        }
        targetId = adminUser.id;
      }

      // If trying to chat with self
      if (targetId === currentUserId) {
         return NextResponse.json({ error: { code: "INVALID_INPUT", message: "You cannot chat with yourself" } }, { status: 400 });
      }

      // Security Check: Only Admin can initiate direct chats with anyone. 
      // Non-admins can only initiate direct chats with Admins.
      const currentUser = await prisma.user.findUnique({ where: { id: currentUserId } });
      const targetUser = await prisma.user.findUnique({ where: { id: targetId } });

      if (!currentUser || !targetUser) {
        return NextResponse.json({ error: { code: "NOT_FOUND", message: "User not found" } }, { status: 404 });
      }

      const isAdminInteraction = currentUser.role === "admin" || targetUser.role === "admin";
      
      if (!isAdminInteraction) {
        return NextResponse.json({ 
          error: { code: "FORBIDDEN", message: "Direct chats are only allowed between users and administrators." } 
        }, { status: 403 });
      }

      // Find existing direct chat
      const existing = await prisma.conversation.findFirst({
        where: {
          type: "DIRECT",
          participants: { 
            every: { userId: { in: [currentUserId, targetId] } } 
          },
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
                { userId: targetId },
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
