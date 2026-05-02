// Slot Generation Engine - Core business logic
// Uses the actual schema: Service → Schedule → WeeklyRule/FlexibleDay → ProviderSlot

import prisma from "@/prisma/prisma";
import { Prisma } from "@/prisma/generated/prisma";

/**
 * Generate ProviderSlots for a given service.
 * Called when: service is published, schedule changes, or customer requests unavailable dates.
 */
export async function generateSlots(
  serviceId: string,
  options?: {
    fromDate?: Date;
    toDate?: Date;
    tx?: Prisma.TransactionClient;
  }
) {
  const tx = options?.tx ?? prisma;

  const service = await tx.service.findUnique({
    where: { id: serviceId },
    include: {
      schedules: {
        include: {
          weeklyRules: true,
          flexibleDays: true,
        },
      },
    },
  });

  if (!service) throw new Error("SERVICE_NOT_FOUND");

  const fromDate = options?.fromDate ?? new Date();
  const toDate = options?.toDate ?? new Date(Date.now() + 60 * 24 * 60 * 60 * 1000); // 60 days

  let slotsCreated = 0;

  for (const schedule of service.schedules) {
    if (schedule.type === "WEEKLY") {
      slotsCreated += await generateWeeklySlots(tx, service, schedule.weeklyRules, fromDate, toDate);
    } else if (schedule.type === "FLEXIBLE") {
      slotsCreated += await generateFlexibleSlots(tx, service, schedule.flexibleDays, fromDate, toDate);
    }
  }

  return { slotsCreated };
}

/**
 * Generate ProviderSlots from WeeklyRules.
 * WeeklyRule stores startMinute/endMinute (minutes since midnight).
 */
async function generateWeeklySlots(
  tx: Prisma.TransactionClient,
  service: { id: string; durationMinutes: number; maxPerSlot: number },
  weeklyRules: { dayOfWeek: number; startMinute: number; endMinute: number }[],
  fromDate: Date,
  toDate: Date
) {
  let slotsCreated = 0;

  const currentDate = new Date(fromDate);
  currentDate.setUTCHours(0, 0, 0, 0);

  while (currentDate <= toDate) {
    const dayOfWeek = currentDate.getUTCDay();
    const dayRules = weeklyRules.filter((r) => r.dayOfWeek === dayOfWeek);

    for (const rule of dayRules) {
      const windowStart = new Date(currentDate);
      windowStart.setUTCMinutes(rule.startMinute);

      const windowEnd = new Date(currentDate);
      windowEnd.setUTCMinutes(rule.endMinute);

      const slotDurationMs = service.durationMinutes * 60 * 1000;
      let slotStart = new Date(windowStart);

      while (slotStart.getTime() + slotDurationMs <= windowEnd.getTime()) {
        const slotEnd = new Date(slotStart.getTime() + slotDurationMs);

        // Check if slot already exists (idempotent)
        const existing = await tx.providerSlot.findFirst({
          where: {
            serviceId: service.id,
            startTime: slotStart,
            endTime: slotEnd,
            userId: null,
            resourceId: null,
          },
        });

        if (!existing) {
          await tx.providerSlot.create({
            data: {
              serviceId: service.id,
              startTime: slotStart,
              endTime: slotEnd,
              capacity: service.maxPerSlot,
              booked: 0,
              isActive: true,
            },
          });
          slotsCreated++;
        }

        slotStart = new Date(slotStart.getTime() + slotDurationMs);
      }
    }

    currentDate.setUTCDate(currentDate.getUTCDate() + 1);
  }

  return slotsCreated;
}

/**
 * Generate ProviderSlots from FlexibleDays.
 * FlexibleDay stores a specific date + startMinute/endMinute.
 */
async function generateFlexibleSlots(
  tx: Prisma.TransactionClient,
  service: { id: string; durationMinutes: number; maxPerSlot: number },
  flexibleDays: { date: Date; startMinute: number; endMinute: number }[],
  fromDate: Date,
  toDate: Date
) {
  let slotsCreated = 0;

  for (const day of flexibleDays) {
    const dayDate = new Date(day.date);
    if (dayDate < fromDate || dayDate > toDate) continue;

    const windowStart = new Date(dayDate);
    windowStart.setUTCMinutes(day.startMinute);

    const windowEnd = new Date(dayDate);
    windowEnd.setUTCMinutes(day.endMinute);

    const slotDurationMs = service.durationMinutes * 60 * 1000;
    let slotStart = new Date(windowStart);

    while (slotStart.getTime() + slotDurationMs <= windowEnd.getTime()) {
      const slotEnd = new Date(slotStart.getTime() + slotDurationMs);

      const existing = await tx.providerSlot.findFirst({
        where: {
          serviceId: service.id,
          startTime: slotStart,
          endTime: slotEnd,
        },
      });

      if (!existing) {
        await tx.providerSlot.create({
          data: {
            serviceId: service.id,
            startTime: slotStart,
            endTime: slotEnd,
            capacity: service.maxPerSlot,
            booked: 0,
            isActive: true,
          },
        });
        slotsCreated++;
      }

      slotStart = new Date(slotStart.getTime() + slotDurationMs);
    }
  }

  return slotsCreated;
}

/**
 * Invalidate future ProviderSlots when schedule changes.
 * Deactivates slots that have no active bookings.
 */
export async function invalidateSlots(
  serviceId: string,
  tx?: Prisma.TransactionClient
) {
  const client = tx ?? prisma;

  // Find slots with active bookings so we don't touch them
  const activeBookingSlotIds = await client.booking.findMany({
    where: {
      serviceId,
      status: { in: ["PENDING", "CONFIRMED"] },
      providerSlot: { startTime: { gt: new Date() } },
    },
    select: { providerSlotId: true },
  });

  const protectedIds = activeBookingSlotIds.map((b) => b.providerSlotId);

  await client.providerSlot.updateMany({
    where: {
      serviceId,
      startTime: { gt: new Date() },
      isActive: true,
      ...(protectedIds.length > 0 ? { id: { notIn: protectedIds } } : {}),
    },
    data: { isActive: false },
  });
}

/**
 * Get available ProviderSlots for a specific date.
 */
export async function getAvailableSlots(
  serviceId: string,
  date: string, // YYYY-MM-DD
  resourceId?: string
) {
  const startDate = new Date(date + "T00:00:00.000Z");
  const endDate = new Date(date + "T23:59:59.999Z");

  const slots = await prisma.providerSlot.findMany({
    where: {
      serviceId,
      startTime: { gte: startDate, lte: endDate },
      isActive: true,
      ...(resourceId ? { resourceId } : {}),
    },
    include: {
      user: { select: { id: true, name: true } },
      resource: { select: { id: true, name: true } },
    },
    orderBy: { startTime: "asc" },
  });

  return slots
    .filter((s) => s.capacity - s.booked > 0)
    .map((slot) => ({
      id: slot.id,
      startUtc: slot.startTime,
      endUtc: slot.endTime,
      remaining: slot.capacity - slot.booked,
      maxCapacity: slot.capacity,
      providerId: slot.userId ?? slot.resourceId ?? null,
      providerName: slot.user?.name ?? slot.resource?.name ?? null,
    }));
}
