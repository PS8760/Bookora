import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/prisma/prisma";
import { createVirtualMeeting } from "@/lib/virtual-meeting";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcrypt";

export const dynamic = "force-dynamic";

const TEST_USERS = {
  customer: {
    id: "test-customer-001",
    name: "Priya Sharma (Test Customer)",
    email: "test.customer@bookora.dev",
    role: "customer",
    password: "TestPass@123",
  },
  organiser: {
    id: "test-organiser-001",
    name: "Dr. Arjun Mehta (Test Organiser)",
    email: "test.organiser@bookora.dev",
    role: "organiser",
    password: "TestPass@123",
  },
};

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session || (session.user as any).role !== "admin") {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const body = await request.json();
    const action = body.action as string;

    // ── SEED ─────────────────────────────────────────────────────────────────
    if (action === "seed") {
      const results: string[] = [];

      // 1. Upsert test users
      const passwordHash = await bcrypt.hash("TestPass@123", 10);

      for (const [key, u] of Object.entries(TEST_USERS)) {
        const existing = await prisma.user.findUnique({ where: { id: u.id } });
        if (!existing) {
          await prisma.user.create({
            data: {
              id: u.id,
              name: u.name,
              email: u.email,
              emailVerified: true,
              role: u.role,
              isActive: true,
              timezone: "Asia/Kolkata",
              accounts: {
                create: {
                  id: `test-account-${key}`,
                  accountId: u.id,
                  providerId: "credential",
                  password: passwordHash,
                },
              },
            },
          });
          results.push(`✓ Created user: ${u.name}`);
        } else {
          results.push(`→ User already exists: ${u.name}`);
        }
      }

      // 2. Create test service
      let service = await prisma.service.findFirst({
        where: { organiserId: TEST_USERS.organiser.id, title: "Virtual Consultation (Test)" },
      });

      if (!service) {
        service = await prisma.service.create({
          data: {
            organiserId: TEST_USERS.organiser.id,
            title: "Virtual Consultation (Test)",
            description: "A test virtual consultation service for demo purposes.",
            category: "Health",
            icon: "🏥",
            durationMinutes: 30,
            type: "USER_BASED",
            isPublished: true,
            virtualEnabled: true,
            virtualPlatform: "MEET",
            manualConfirm: false,
            advancePayment: false,
            maxPerSlot: 1,
          },
        });
        results.push(`✓ Created service: ${service.title}`);
      } else {
        results.push(`→ Service already exists: ${service.title}`);
      }

      // 3. Create provider slots (future, active, past)
      const now = new Date();

      const slotConfigs = [
        {
          id: "test-slot-future",
          label: "Future (tomorrow 8:30 PM)",
          start: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 20, 30),
          end: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 21, 0),
        },
        {
          id: "test-slot-active",
          label: "Active (now + 5 mins)",
          start: new Date(now.getTime() - 5 * 60 * 1000),
          end: new Date(now.getTime() + 25 * 60 * 1000),
        },
        {
          id: "test-slot-past",
          label: "Past (yesterday)",
          start: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 10, 0),
          end: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 10, 30),
        },
        {
          id: "test-slot-upcoming-30",
          label: "Upcoming in 30 mins (reminder test)",
          start: new Date(now.getTime() + 30 * 60 * 1000),
          end: new Date(now.getTime() + 60 * 60 * 1000),
        },
      ];

      for (const slot of slotConfigs) {
        const existing = await prisma.providerSlot.findUnique({ where: { id: slot.id } });
        if (!existing) {
          await prisma.providerSlot.create({
            data: {
              id: slot.id,
              serviceId: service.id,
              userId: TEST_USERS.organiser.id,
              startTime: slot.start,
              endTime: slot.end,
              capacity: 1,
              booked: 0,
              isActive: true,
            },
          });
          results.push(`✓ Created slot: ${slot.label}`);
        } else {
          results.push(`→ Slot exists: ${slot.label}`);
        }
      }

      // 4. Create bookings + virtual meetings
      const bookingConfigs = [
        { id: "test-booking-future",    slotId: "test-slot-future",    label: "Future Booking" },
        { id: "test-booking-active",    slotId: "test-slot-active",    label: "Active Booking" },
        { id: "test-booking-past",      slotId: "test-slot-past",      label: "Past Booking" },
        { id: "test-booking-reminder",  slotId: "test-slot-upcoming-30", label: "Reminder Booking" },
      ];

      for (const b of bookingConfigs) {
        const existing = await prisma.booking.findUnique({ where: { id: b.id } });
        if (!existing) {
          const slot = slotConfigs.find((s) => s.id === b.slotId)!;

          await prisma.booking.create({
            data: {
              id: b.id,
              customerId: TEST_USERS.customer.id,
              serviceId: service.id,
              providerSlotId: b.slotId,
              userId: TEST_USERS.organiser.id,
              status: "CONFIRMED",
              paymentStatus: "UNPAID",
              confirmedAt: new Date(),
            },
          });

          // Update slot booked count
          await prisma.providerSlot.update({
            where: { id: b.slotId },
            data: { booked: 1 },
          });

          // Create virtual meeting
          const meeting = await createVirtualMeeting({
            platform: "MEET",
            startTime: slot.start,
            endTime: slot.end,
            title: service.title,
            bookingId: b.id,
          });

          await prisma.virtualMeeting.create({
            data: {
              bookingId: b.id,
              platform: meeting.platform,
              meetingLink: meeting.meetingLink,
              meetingId: meeting.meetingId,
              status: "SCHEDULED",
              startTime: slot.start,
              endTime: slot.end,
            },
          });

          results.push(`✓ Created: ${b.label} + virtual meeting`);
        } else {
          results.push(`→ Booking exists: ${b.label}`);
        }
      }

      return NextResponse.json({
        success: true,
        message: "Test data seeded successfully",
        results,
        credentials: {
          customer: { email: TEST_USERS.customer.email, password: "TestPass@123" },
          organiser: { email: TEST_USERS.organiser.email, password: "TestPass@123" },
        },
      });
    }

    // ── CLEANUP ───────────────────────────────────────────────────────────────
    if (action === "cleanup") {
      const bookingIds = ["test-booking-future", "test-booking-active", "test-booking-past", "test-booking-reminder"];
      const slotIds = ["test-slot-future", "test-slot-active", "test-slot-past", "test-slot-upcoming-30"];

      await prisma.virtualMeeting.deleteMany({ where: { bookingId: { in: bookingIds } } });
      await prisma.notification.deleteMany({ where: { bookingId: { in: bookingIds } } });
      await prisma.auditLog.deleteMany({ where: { bookingId: { in: bookingIds } } });
      await prisma.bookingAnswer.deleteMany({ where: { bookingId: { in: bookingIds } } });
      await prisma.booking.deleteMany({ where: { id: { in: bookingIds } } });
      await prisma.providerSlot.deleteMany({ where: { id: { in: slotIds } } });

      const service = await prisma.service.findFirst({
        where: { organiserId: TEST_USERS.organiser.id, title: "Virtual Consultation (Test)" },
      });
      if (service) {
        await prisma.service.delete({ where: { id: service.id } });
      }

      await prisma.account.deleteMany({ where: { userId: { in: [TEST_USERS.customer.id, TEST_USERS.organiser.id] } } });
      await prisma.user.deleteMany({ where: { id: { in: [TEST_USERS.customer.id, TEST_USERS.organiser.id] } } });

      return NextResponse.json({ success: true, message: "Test data cleaned up successfully" });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    console.error("Test seed error:", err);
    return NextResponse.json({ error: err.message ?? "Internal error" }, { status: 500 });
  }
}
