# Real-Time Booking System & Notifications Implementation Guide

## Overview
This guide covers the implementation of:
1. **Automatic slot generation** when services are created
2. **Real-time notification system** for bookings, role changes, and daily updates
3. **In-app notification bell** with unread count

## Problem 1: Services Show "Fully Booked" After Creation

### Root Cause
When a service is created via `/api/appointments` (POST), no Schedule is created, so no slots are generated. The `getAvailableSlots` function has on-demand generation, but services still appear fully booked in listings.

### Solution: Auto-Create Default Schedule

Update `/app/api/appointments/route.ts` POST endpoint:

```typescript
import { generateSlots } from "@/lib/slots";

// After creating the service:
const service = await prisma.service.create({ ... });

// Create a default weekly schedule (Mon-Fri, 9 AM - 5 PM)
const schedule = await prisma.schedule.create({
  data: {
    serviceId: service.id,
    type: "WEEKLY",
    weeklyRules: {
      createMany: {
        data: [
          { dayOfWeek: 1, startMinute: 540, endMinute: 1020 }, // Monday
          { dayOfWeek: 2, startMinute: 540, endMinute: 1020 }, // Tuesday
          { dayOfWeek: 3, startMinute: 540, endMinute: 1020 }, // Wednesday
          { dayOfWeek: 4, startMinute: 540, endMinute: 1020 }, // Thursday
          { dayOfWeek: 5, startMinute: 540, endMinute: 1020 }, // Friday
        ],
      },
    },
  },
});

// Generate slots for the next 60 days
await generateSlots(service.id);

// Send notification
await notifyServiceCreated(service.id);

return NextResponse.json({ data: service }, { status: 201 });
```

### Alternative: Allow Organizers to Configure Schedule

Create a schedule configuration page at `/organiser/services/[id]/schedule` where organisers can:
- Choose between WEEKLY or FLEXIBLE schedule types
- Set working hours for each day
- Add specific dates for flexible schedules
- Preview generated slots

## Problem 2: No Notification System

### Solution Implemented

#### 1. Notification Library (`/lib/notifications.ts`)
- ✅ Created comprehensive notification templates
- ✅ Functions for sending notifications across channels (EMAIL, SMS, PUSH)
- ✅ In-app notification retrieval and management
- ✅ Unread count tracking

#### 2. API Endpoints
- ✅ `GET /api/notifications` - Get user's notifications
- ✅ `GET /api/notifications/unread-count` - Get unread count
- ✅ `POST /api/notifications/read` - Mark as read

#### 3. UI Component
- ✅ `NotificationBell` component with dropdown
- ✅ Real-time polling (every 10 seconds)
- ✅ Unread badge
- ✅ Type-based icons and colors
- ✅ Integrated into Navbar

### Integration Points

#### Booking Confirmation
```typescript
// In /app/api/bookings/[id]/confirm/route.ts
import { notifyBookingConfirmed } from "@/lib/notifications";

// After confirming booking:
await notifyBookingConfirmed(bookingId);
```

#### Booking Creation
```typescript
// In /app/api/bookings/route.ts
import { notifyNewBookingRequest } from "@/lib/notifications";

// After creating booking:
if (service.manualConfirm) {
  await notifyNewBookingRequest(booking.id);
} else {
  await notifyBookingConfirmed(booking.id);
}
```

#### Booking Cancellation
```typescript
// In /app/api/bookings/[id]/cancel/route.ts
import { notifyBookingCancelled } from "@/lib/notifications";

// After cancelling:
await notifyBookingCancelled(bookingId);
```

#### Service Published
```typescript
// In /app/api/appointments/[id]/publish/route.ts
import { notifyServicePublished } from "@/lib/notifications";

// After publishing:
await notifyServicePublished(serviceId);
```

#### Role Change
```typescript
// In /app/api/admin/users/[id]/route.ts
import { notifyRoleChanged } from "@/lib/notifications";

// After updating role:
if (oldRole !== newRole) {
  await notifyRoleChanged(userId, oldRole, newRole);
}
```

## Daily Summary Notifications

### Implementation with Cron Job

Create `/app/api/cron/daily-summary/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/prisma/prisma";
import { NotificationTemplates, sendNotification } from "@/lib/notifications";

export const dynamic = "force-dynamic";

// This endpoint should be called by a cron job (Vercel Cron, AWS EventBridge, etc.)
// Verify with a secret token
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get all organisers
    const organisers = await prisma.user.findMany({
      where: { role: "organiser", isActive: true },
      select: { id: true, name: true },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    for (const organiser of organisers) {
      // Get today's stats
      const [todayBookings, pendingBookings, revenue, upcomingAppointments] = await Promise.all([
        prisma.booking.count({
          where: {
            service: { organiserId: organiser.id },
            createdAt: { gte: today, lt: tomorrow },
          },
        }),
        prisma.booking.count({
          where: {
            service: { organiserId: organiser.id },
            status: "PENDING",
          },
        }),
        prisma.payment.aggregate({
          where: {
            booking: { service: { organiserId: organiser.id } },
            status: "PAID",
            paidAt: { gte: today, lt: tomorrow },
          },
          _sum: { amount: true },
        }),
        prisma.booking.count({
          where: {
            service: { organiserId: organiser.id },
            status: { in: ["PENDING", "CONFIRMED"] },
            providerSlot: { startTime: { gte: new Date() } },
          },
        }),
      ]);

      const stats = {
        todayBookings,
        pendingBookings,
        revenue: Number(revenue._sum.amount ?? 0),
        upcomingAppointments,
      };

      const template = NotificationTemplates.DAILY_SUMMARY_ORGANISER(organiser.name, stats);

      await sendNotification({
        userId: organiser.id,
        ...template,
        channels: ["EMAIL"],
      });
    }

    // Get all customers with upcoming appointments
    const customers = await prisma.user.findMany({
      where: {
        role: "customer",
        isActive: true,
        customerBookings: {
          some: {
            status: { in: ["PENDING", "CONFIRMED"] },
            providerSlot: { startTime: { gte: new Date() } },
          },
        },
      },
      select: { id: true, name: true },
      include: {
        customerBookings: {
          where: {
            status: { in: ["PENDING", "CONFIRMED"] },
            providerSlot: { startTime: { gte: new Date() } },
          },
          include: {
            service: { select: { title: true } },
            providerSlot: { select: { startTime: true } },
          },
          orderBy: { providerSlot: { startTime: "asc" } },
          take: 1,
        },
      },
    });

    for (const customer of customers) {
      const upcomingCount = customer.customerBookings.length;
      const nextAppointment = customer.customerBookings[0];
      const nextAppointmentStr = nextAppointment
        ? `${nextAppointment.service.title} on ${new Date(nextAppointment.providerSlot.startTime).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}`
        : undefined;

      const template = NotificationTemplates.DAILY_SUMMARY_CUSTOMER(
        customer.name,
        upcomingCount,
        nextAppointmentStr
      );

      await sendNotification({
        userId: customer.id,
        ...template,
        channels: ["EMAIL"],
      });
    }

    return NextResponse.json({ message: "Daily summaries sent successfully" });
  } catch (error) {
    console.error("Daily summary error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
```

### Vercel Cron Configuration

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/daily-summary",
      "schedule": "0 8 * * *"
    }
  ]
}
```

Set environment variable:
```
CRON_SECRET=your-secret-token-here
```

## Real-Time Updates with WebSockets (Optional Enhancement)

For true real-time notifications without polling, implement WebSockets:

### 1. Install Socket.IO
```bash
npm install socket.io socket.io-client
```

### 2. Create WebSocket Server
```typescript
// /lib/socket-server.ts
import { Server } from "socket.io";

export function initSocketServer(httpServer: any) {
  const io = new Server(httpServer, {
    cors: { origin: "*" },
  });

  io.on("connection", (socket) => {
    const userId = socket.handshake.auth.userId;
    if (userId) {
      socket.join(`user:${userId}`);
    }
  });

  return io;
}

export function emitNotification(io: Server, userId: string, notification: any) {
  io.to(`user:${userId}`).emit("notification", notification);
}
```

### 3. Update Notification Functions
```typescript
// In /lib/notifications.ts
import { getSocketServer } from "@/lib/socket-server";

export async function sendNotification(payload: NotificationPayload): Promise<void> {
  // ... existing code ...

  // Emit real-time event
  const io = getSocketServer();
  if (io) {
    io.to(`user:${payload.userId}`).emit("notification", {
      type: inferNotificationType(payload.subject ?? ""),
      title: payload.subject,
      message: payload.body,
      timestamp: new Date(),
    });
  }
}
```

## Testing Checklist

- [ ] Create a new service → verify default schedule is created
- [ ] Publish a service → verify slots are generated
- [ ] Book an appointment → verify customer and organiser receive notifications
- [ ] Confirm a booking → verify confirmation notifications
- [ ] Cancel a booking → verify cancellation notifications
- [ ] Change user role → verify role change notification
- [ ] Check notification bell → verify unread count
- [ ] Mark notifications as read → verify count updates
- [ ] Test daily summary cron job
- [ ] Verify no double-booking is possible
- [ ] Test slot availability updates in real-time

## Production Considerations

1. **Email Service**: Integrate SendGrid, AWS SES, or similar
2. **SMS Service**: Integrate Twilio, AWS SNS, or similar
3. **Push Notifications**: Integrate Firebase Cloud Messaging or OneSignal
4. **Background Jobs**: Use Bull/BullMQ for async notification processing
5. **Rate Limiting**: Prevent notification spam
6. **Unsubscribe**: Allow users to manage notification preferences
7. **Monitoring**: Track notification delivery rates and failures
8. **Caching**: Cache notification counts with Redis
9. **WebSockets**: For true real-time updates (optional)
10. **Database Indexes**: Ensure proper indexes on notification queries

## Next Steps

1. Implement automatic schedule creation on service creation
2. Add notification triggers to all booking state changes
3. Test notification delivery across all channels
4. Set up cron job for daily summaries
5. Add user notification preferences page
6. Implement email/SMS delivery with actual providers
7. Add notification history page
8. Implement notification preferences (email, SMS, push toggles)
