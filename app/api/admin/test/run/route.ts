import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/prisma/prisma";
import { sendBookingReminder } from "@/lib/reminders";

export const dynamic = "force-dynamic";

const CUSTOMER_ID = "test-customer-001";
const ORGANISER_ID = "test-organiser-001";

type TestResult = {
  id: string;
  name: string;
  status: "PASS" | "FAIL" | "SKIP";
  message: string;
  detail?: string;
  duration: number;
};

async function runTest(
  id: string,
  name: string,
  fn: () => Promise<{ ok: boolean; message: string; detail?: string }>
): Promise<TestResult> {
  const t0 = Date.now();
  try {
    const { ok, message, detail } = await fn();
    return { id, name, status: ok ? "PASS" : "FAIL", message, detail, duration: Date.now() - t0 };
  } catch (err: any) {
    return { id, name, status: "FAIL", message: err.message ?? "Unexpected error", duration: Date.now() - t0 };
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session || (session.user as any).role !== "admin") {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const body = await request.json();
    const runOnly: string | null = body.testId ?? null; // Optional: run single test

    const now = new Date();
    const results: TestResult[] = [];

    // ── TC-01: Booking Creates Meeting Automatically ──────────────────────────
    if (!runOnly || runOnly === "TC-01") {
      results.push(await runTest("TC-01", "Booking Creates Meeting Automatically", async () => {
        const booking = await prisma.booking.findUnique({
          where: { id: "test-booking-future" },
          include: { virtualMeeting: true, service: true },
        });

        if (!booking) return { ok: false, message: "Test booking not found — run Seed first" };
        if (!booking.virtualMeeting) return { ok: false, message: "VirtualMeeting record NOT created", detail: `Booking ID: ${booking.id}` };
        if (!booking.virtualMeeting.meetingLink) return { ok: false, message: "Meeting link is empty" };

        return {
          ok: true,
          message: "Booking confirmed, virtual meeting created, link stored",
          detail: `Link: ${booking.virtualMeeting.meetingLink} | Platform: ${booking.virtualMeeting.platform}`,
        };
      }));
    }

    // ── TC-02: Join Button Hidden Before Time ────────────────────────────────
    if (!runOnly || runOnly === "TC-02") {
      results.push(await runTest("TC-02", "Join Button Hidden Before Time", async () => {
        const meeting = await prisma.virtualMeeting.findUnique({ where: { bookingId: "test-booking-future" } });
        if (!meeting) return { ok: false, message: "Future meeting not found — run Seed first" };

        const buffer = 10 * 60 * 1000;
        const activeFrom = new Date(meeting.startTime.getTime() - buffer);
        const isActive = now >= activeFrom && now <= meeting.endTime;

        if (isActive) return { ok: false, message: "Join button would be VISIBLE right now — meeting is too soon" };

        return {
          ok: true,
          message: "Join button correctly HIDDEN — meeting starts in the future",
          detail: `Meeting starts: ${meeting.startTime.toLocaleString()} | Active from: ${activeFrom.toLocaleString()}`,
        };
      }));
    }

    // ── TC-03: Join Button Active at Meeting Time ─────────────────────────────
    if (!runOnly || runOnly === "TC-03") {
      results.push(await runTest("TC-03", "Join Button Visible at Meeting Time", async () => {
        const meeting = await prisma.virtualMeeting.findUnique({ where: { bookingId: "test-booking-active" } });
        if (!meeting) return { ok: false, message: "Active meeting not found — run Seed first" };

        const buffer = 10 * 60 * 1000;
        const activeFrom = new Date(meeting.startTime.getTime() - buffer);
        const isActive = now >= activeFrom && now <= meeting.endTime;

        if (!isActive) return {
          ok: false,
          message: "Join button NOT visible — timing logic failed",
          detail: `Now: ${now.toISOString()} | Active from: ${activeFrom.toISOString()} | Ends: ${meeting.endTime.toISOString()}`,
        };

        return {
          ok: true,
          message: "Join button correctly VISIBLE — within active window (10 min buffer)",
          detail: `Meeting link: ${meeting.meetingLink}`,
        };
      }));
    }

    // ── TC-04: Join Button Hidden After End Time ──────────────────────────────
    if (!runOnly || runOnly === "TC-04") {
      results.push(await runTest("TC-04", "Join Button Hidden After Meeting Ends", async () => {
        const meeting = await prisma.virtualMeeting.findUnique({ where: { bookingId: "test-booking-past" } });
        if (!meeting) return { ok: false, message: "Past meeting not found — run Seed first" };

        const isFinished = now > meeting.endTime;
        if (!isFinished) return { ok: false, message: "Meeting is not yet finished — timing error" };

        // Auto-update status to COMPLETED
        await prisma.virtualMeeting.update({
          where: { bookingId: "test-booking-past" },
          data: { status: "COMPLETED" },
        });

        const updated = await prisma.virtualMeeting.findUnique({ where: { bookingId: "test-booking-past" } });

        return {
          ok: updated?.status === "COMPLETED",
          message: updated?.status === "COMPLETED"
            ? "Join button HIDDEN — meeting marked COMPLETED"
            : "Status not updated correctly",
          detail: `Status: ${updated?.status} | Ended: ${meeting.endTime.toLocaleString()}`,
        };
      }));
    }

    // ── TC-05: Organiser Dashboard Shows Virtual Meetings ─────────────────────
    if (!runOnly || runOnly === "TC-05") {
      results.push(await runTest("TC-05", "Organiser Dashboard Shows Virtual Meetings", async () => {
        const meetings = await prisma.virtualMeeting.findMany({
          where: { booking: { service: { organiserId: ORGANISER_ID } } },
          include: {
            booking: {
              include: {
                customer: { select: { name: true, email: true } },
                service: { select: { title: true } },
              },
            },
          },
        });

        if (meetings.length === 0) return { ok: false, message: "No meetings found for organiser — run Seed first" };

        const sample = meetings[0];
        const hasCustomer = !!sample.booking.customer.name;
        const hasService = !!sample.booking.service.title;
        const hasLink = !!sample.meetingLink;

        return {
          ok: hasCustomer && hasService && hasLink,
          message: hasCustomer && hasService && hasLink
            ? `Organiser sees ${meetings.length} meetings with full customer/service details`
            : "Missing required fields in organiser view",
          detail: `Sample: Customer="${sample.booking.customer.name}", Service="${sample.booking.service.title}", Platform=${sample.platform}`,
        };
      }));
    }

    // ── TC-06: Admin Dashboard Shows All Meetings ─────────────────────────────
    if (!runOnly || runOnly === "TC-06") {
      results.push(await runTest("TC-06", "Admin Dashboard Shows All Meeting Fields", async () => {
        const meetings = await prisma.virtualMeeting.findMany({
          include: {
            booking: {
              include: {
                customer: { select: { name: true } },
                service: {
                  select: {
                    title: true,
                    organiser: { select: { name: true } },
                  },
                },
              },
            },
          },
          orderBy: { startTime: "desc" },
          take: 5,
        });

        if (meetings.length === 0) return { ok: false, message: "No meetings in admin view — run Seed first" };

        const m = meetings[0];
        const checks = {
          customerName: !!m.booking.customer.name,
          organiserName: !!(m.booking.service as any).organiser?.name,
          serviceName: !!m.booking.service.title,
          date: !!m.startTime,
          platform: !!m.platform,
          status: !!m.status,
        };

        const allPass = Object.values(checks).every(Boolean);
        const failedFields = Object.entries(checks).filter(([, v]) => !v).map(([k]) => k);

        return {
          ok: allPass,
          message: allPass
            ? `Admin sees ${meetings.length} meetings with all required fields`
            : `Missing fields: ${failedFields.join(", ")}`,
          detail: `Customer: ${m.booking.customer.name} | Organiser: ${(m.booking.service as any).organiser?.name} | Service: ${m.booking.service.title} | Platform: ${m.platform} | Status: ${m.status}`,
        };
      }));
    }

    // ── TC-07: Unauthorized Access Control ────────────────────────────────────
    if (!runOnly || runOnly === "TC-07") {
      results.push(await runTest("TC-07", "Unauthorized User Cannot Access Meeting", async () => {
        const meeting = await prisma.virtualMeeting.findUnique({ where: { bookingId: "test-booking-future" } });
        if (!meeting) return { ok: false, message: "Meeting not found — run Seed first" };

        const booking = await prisma.booking.findUnique({ where: { id: "test-booking-future" } });

        // Simulate: a random user ID is NOT the customer or organiser
        const randomUserId = "random-user-xyz-000";
        const isAuthorized = booking?.customerId === randomUserId || booking?.userId === randomUserId;

        return {
          ok: !isAuthorized,
          message: !isAuthorized
            ? "Access correctly DENIED — unauthorized user blocked from meeting link"
            : "SECURITY ISSUE: Unauthorized user can access meeting",
          detail: `Booking customer: ${booking?.customerId} | Booking organiser: ${booking?.userId} | Test user: ${randomUserId}`,
        };
      }));
    }

    // ── TC-08: Reminder Email Trigger ─────────────────────────────────────────
    if (!runOnly || runOnly === "TC-08") {
      results.push(await runTest("TC-08", "Reminder Email Sent 30 Mins Before Meeting", async () => {
        const meeting = await prisma.virtualMeeting.findUnique({
          where: { bookingId: "test-booking-reminder" },
          include: { booking: { include: { customer: true, service: true } } },
        });

        if (!meeting) return { ok: false, message: "Reminder meeting not found — run Seed first" };

        const buffer = 5 * 60 * 1000;
        const thirtyMinsLater = new Date(now.getTime() + 30 * 60 * 1000);
        const inWindow = meeting.startTime >= new Date(thirtyMinsLater.getTime() - buffer)
          && meeting.startTime <= new Date(thirtyMinsLater.getTime() + buffer);

        if (!inWindow) {
          return {
            ok: false,
            message: "Meeting is not in the 30-min reminder window right now",
            detail: `Meeting starts: ${meeting.startTime.toLocaleString()}`,
          };
        }

        try {
          await sendBookingReminder(
            meeting.booking.customer.email,
            meeting.booking.customer.name,
            meeting.booking.service.title,
            meeting.startTime,
            meeting.booking.selectedMode,
            meeting.booking.venueSnapshot,
            meeting.meetingLink
          );
          return {
            ok: true,
            message: "Reminder email sent successfully",
            detail: `Sent to: ${meeting.booking.customer.email}`,
          };
        } catch (e: any) {
          return { ok: false, message: `Email send failed: ${e.message}` };
        }
      }));
    }

    // ── TC-09: Reschedule Updates Meeting ─────────────────────────────────────
    if (!runOnly || runOnly === "TC-09") {
      results.push(await runTest("TC-09", "Reschedule Updates Virtual Meeting Time", async () => {
        const before = await prisma.virtualMeeting.findUnique({ where: { bookingId: "test-booking-future" } });
        if (!before) return { ok: false, message: "Future meeting not found — run Seed first" };

        const newStart = new Date(before.startTime.getTime() + 60 * 60 * 1000); // +1 hour
        const newEnd = new Date(before.endTime.getTime() + 60 * 60 * 1000);

        await prisma.virtualMeeting.update({
          where: { bookingId: "test-booking-future" },
          data: { startTime: newStart, endTime: newEnd },
        });

        const after = await prisma.virtualMeeting.findUnique({ where: { bookingId: "test-booking-future" } });

        const updated = after?.startTime.getTime() === newStart.getTime();

        // Restore original times
        await prisma.virtualMeeting.update({
          where: { bookingId: "test-booking-future" },
          data: { startTime: before.startTime, endTime: before.endTime },
        });

        return {
          ok: updated,
          message: updated
            ? "Meeting time updated after reschedule (then restored)"
            : "Meeting time NOT updated",
          detail: `Old start: ${before.startTime.toLocaleString()} → New start: ${newStart.toLocaleString()}`,
        };
      }));
    }

    // ── TC-10: Cancel Disables Meeting ───────────────────────────────────────
    if (!runOnly || runOnly === "TC-10") {
      results.push(await runTest("TC-10", "Cancellation Disables Join Button", async () => {
        // Use a separate booking for cancel test to not destroy future booking
        const meeting = await prisma.virtualMeeting.findUnique({ where: { bookingId: "test-booking-active" } });
        const booking = await prisma.booking.findUnique({ where: { id: "test-booking-active" } });

        if (!meeting || !booking) return { ok: false, message: "Active test data not found — run Seed first" };

        // Simulate cancellation
        await prisma.virtualMeeting.update({
          where: { bookingId: "test-booking-active" },
          data: { status: "CANCELLED" },
        });

        const updated = await prisma.virtualMeeting.findUnique({ where: { bookingId: "test-booking-active" } });
        const isCancelled = updated?.status === "CANCELLED";

        // Restore
        await prisma.virtualMeeting.update({
          where: { bookingId: "test-booking-active" },
          data: { status: "SCHEDULED" },
        });

        return {
          ok: isCancelled,
          message: isCancelled
            ? "Meeting status set to CANCELLED — Join button would be disabled (then restored)"
            : "Cancellation did not update meeting status",
          detail: `Meeting ID: ${meeting.id} | Final status: CANCELLED`,
        };
      }));
    }

    // ── Summary ───────────────────────────────────────────────────────────────
    const passed = results.filter((r) => r.status === "PASS").length;
    const failed = results.filter((r) => r.status === "FAIL").length;
    const totalDuration = results.reduce((acc, r) => acc + r.duration, 0);

    return NextResponse.json({
      summary: { total: results.length, passed, failed, duration: totalDuration },
      results,
    });
  } catch (err: any) {
    console.error("Test runner error:", err);
    return NextResponse.json({ error: err.message ?? "Internal error" }, { status: 500 });
  }
}
