/**
 * Slot Generation Engine — Production-grade
 *
 * Key improvements over v1:
 * - Batch createMany instead of N individual creates (10-100x faster)
 * - Single bulk existence check instead of N+1 findFirst calls
 * - Correct UTC-aware date boundaries for slot queries
 * - On-demand slot generation: if no slots exist for a requested date,
 *   generate them on the fly (handles services created before this fix)
 * - Idempotent: safe to call multiple times
 */

import prisma from "@/prisma/prisma";
import { Prisma } from "@prisma/client";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SlotCandidate {
  serviceId: string;
  startTime: Date;
  endTime: Date;
  capacity: number;
  booked: number;
  isActive: boolean;
  userId: null;
  resourceId: null;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Generate ProviderSlots for a service from its Schedule rules.
 * Uses batch inserts — safe to call on publish or schedule change.
 */
export async function generateSlots(
  serviceId: string,
  options?: {
    fromDate?: Date;
    toDate?: Date;
    tx?: Prisma.TransactionClient;
  }
): Promise<{ slotsCreated: number }> {
  const db = options?.tx ?? prisma;

  const service = await db.service.findUnique({
    where: { id: serviceId },
    include: {
      schedules: {
        include: { weeklyRules: true, flexibleDays: true },
      },
    },
  });

  if (!service) throw new Error("SERVICE_NOT_FOUND");
  if (service.schedules.length === 0) return { slotsCreated: 0 };

  const fromDate = options?.fromDate ?? new Date();
  const toDate =
    options?.toDate ?? new Date(Date.now() + 60 * 24 * 60 * 60 * 1000); // 60 days

  // Collect all candidate slots across all schedules
  const candidates: SlotCandidate[] = [];

  for (const schedule of service.schedules) {
    if (schedule.type === "WEEKLY") {
      collectWeeklySlots(candidates, service, schedule.weeklyRules, fromDate, toDate);
    } else if (schedule.type === "FLEXIBLE") {
      collectFlexibleSlots(candidates, service, schedule.flexibleDays, fromDate, toDate);
    }
  }

  if (candidates.length === 0) return { slotsCreated: 0 };

  // In-memory de-duplication: some overlapping rules might generate identical slots
  const uniqueCandidates: SlotCandidate[] = [];
  const seen = new Set<string>();
  for (const c of candidates) {
    const key = `${c.serviceId}|${c.startTime.getTime()}|${c.endTime.getTime()}|${c.userId}|${c.resourceId}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueCandidates.push(c);
    }
  }

  // Bulk-fetch existing slots in the date range to avoid duplicates
  const existing = await db.providerSlot.findMany({
    where: {
      serviceId,
      startTime: { gte: fromDate, lte: toDate },
    },
    select: { startTime: true, endTime: true, userId: true, resourceId: true },
  });

  // Build a Set of lookup keys for O(1) matching
  const existingKeys = new Set(
    existing.map((s: any) => `${s.startTime.getTime()}|${s.endTime.getTime()}|${s.userId}|${s.resourceId}`)
  );

  const newSlots = uniqueCandidates.filter(
    (c) => !existingKeys.has(`${c.startTime.getTime()}|${c.endTime.getTime()}|${c.userId}|${c.resourceId}`)
  );

  if (newSlots.length === 0) return { slotsCreated: 0 };

  // Batch insert — skipDuplicates as a safety net
  const result = await db.providerSlot.createMany({
    data: newSlots,
    skipDuplicates: true,
  });

  return { slotsCreated: result.count };
}

/**
 * Invalidate future ProviderSlots when schedule changes.
 * Preserves slots that have active bookings.
 */
export async function invalidateSlots(
  serviceId: string,
  tx?: Prisma.TransactionClient
): Promise<void> {
  const db = tx ?? prisma;

  const activeBookingSlotIds = await db.booking.findMany({
    where: {
      serviceId,
      status: { in: ["PENDING", "CONFIRMED"] },
      providerSlot: { startTime: { gt: new Date() } },
    },
    select: { providerSlotId: true },
  });

  const protectedIds = activeBookingSlotIds.map((b: any) => b.providerSlotId);

  await db.providerSlot.updateMany({
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
 *
 * If no slots exist for the requested date (e.g. service was published before
 * slot generation was fixed), generates them on-demand first.
 *
 * Uses correct UTC-aware boundaries: the date string is treated as a calendar
 * date in UTC. Callers should pass dates in YYYY-MM-DD format.
 */
export async function getAvailableSlots(
  serviceId: string,
  date: string, // YYYY-MM-DD
  resourceId?: string
): Promise<SlotResult[]> {
  // Parse the date as UTC midnight → UTC end-of-day
  const [year, month, day] = date.split("-").map(Number);
  const startOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  const endOfDay = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));

  // Skip past dates entirely
  if (endOfDay < new Date()) return [];

  const baseWhere = {
    serviceId,
    startTime: { gte: startOfDay, lte: endOfDay },
    isActive: true,
    ...(resourceId ? { resourceId } : {}),
  };

  let slots = await prisma.providerSlot.findMany({
    where: baseWhere,
    include: {
      user: { select: { id: true, name: true } },
      resource: { select: { id: true, name: true } },
    },
    orderBy: { startTime: "asc" },
  });

  // On-demand generation: if no slots exist for this date, try to generate them
  if (slots.length === 0) {
    try {
      await generateSlots(serviceId, {
        fromDate: startOfDay,
        toDate: endOfDay,
      });

      slots = await prisma.providerSlot.findMany({
        where: baseWhere,
        include: {
          user: { select: { id: true, name: true } },
          resource: { select: { id: true, name: true } },
        },
        orderBy: { startTime: "asc" },
      });
    } catch {
      // Generation failed (no schedule configured) — return empty
      return [];
    }
  }

  // Filter out past slots and fully-booked slots
  const now = new Date();
  return slots
    .filter((s: any) => s.startTime > now && s.capacity - s.booked > 0)
    .map((slot: any) => ({
      id: slot.id,
      startUtc: slot.startTime,
      endUtc: slot.endTime,
      remaining: slot.capacity - slot.booked,
      maxCapacity: slot.capacity,
      version: slot.version,
      providerId: slot.userId ?? slot.resourceId ?? null,
      providerName: slot.user?.name ?? slot.resource?.name ?? null,
    }));
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function collectWeeklySlots(
  out: SlotCandidate[],
  service: { id: string; durationMinutes: number; maxPerSlot: number },
  weeklyRules: { dayOfWeek: number; startMinute: number; endMinute: number }[],
  fromDate: Date,
  toDate: Date
): void {
  const slotMs = service.durationMinutes * 60 * 1000;

  // Iterate day by day in UTC
  const cursor = new Date(fromDate);
  cursor.setUTCHours(0, 0, 0, 0);

  while (cursor <= toDate) {
    const dow = cursor.getUTCDay();
    const dayRules = weeklyRules.filter((r) => r.dayOfWeek === dow);

    for (const rule of dayRules) {
      const windowStart = new Date(cursor);
      windowStart.setUTCHours(0, rule.startMinute, 0, 0);

      const windowEnd = new Date(cursor);
      windowEnd.setUTCHours(0, rule.endMinute, 0, 0);

      let slotStart = new Date(windowStart);

      while (slotStart.getTime() + slotMs <= windowEnd.getTime()) {
        const slotEnd = new Date(slotStart.getTime() + slotMs);
        out.push({
          serviceId: service.id,
          startTime: new Date(slotStart),
          endTime: new Date(slotEnd),
          capacity: service.maxPerSlot,
          booked: 0,
          isActive: true,
          userId: null,
          resourceId: null,
        });
        slotStart = new Date(slotStart.getTime() + slotMs);
      }
    }

    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
}

function collectFlexibleSlots(
  out: SlotCandidate[],
  service: { id: string; durationMinutes: number; maxPerSlot: number },
  flexibleDays: { date: Date; startMinute: number; endMinute: number }[],
  fromDate: Date,
  toDate: Date
): void {
  const slotMs = service.durationMinutes * 60 * 1000;

  for (const day of flexibleDays) {
    const dayDate = new Date(day.date);
    if (dayDate < fromDate || dayDate > toDate) continue;

    const windowStart = new Date(dayDate);
    windowStart.setUTCHours(0, day.startMinute, 0, 0);

    const windowEnd = new Date(dayDate);
    windowEnd.setUTCHours(0, day.endMinute, 0, 0);

    let slotStart = new Date(windowStart);

    while (slotStart.getTime() + slotMs <= windowEnd.getTime()) {
      const slotEnd = new Date(slotStart.getTime() + slotMs);
      out.push({
        serviceId: service.id,
        startTime: new Date(slotStart),
        endTime: new Date(slotEnd),
        capacity: service.maxPerSlot,
        booked: 0,
        isActive: true,
        userId: null,
        resourceId: null,
      });
      slotStart = new Date(slotStart.getTime() + slotMs);
    }
  }
}

// ─── Exported types ───────────────────────────────────────────────────────────

export interface SlotResult {
  id: string;
  startUtc: Date;
  endUtc: Date;
  remaining: number;
  maxCapacity: number;
  version: number;
  providerId: string | null;
  providerName: string | null;
}
