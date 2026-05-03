import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/prisma/prisma';

export const dynamic = 'force-dynamic';

const DAY_TO_NUM: Record<string, number> = {
  MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6, SUN: 0,
};

/** Parse "HH:MM" → { hours, minutes } */
function parseHHMM(t: string): { hours: number; minutes: number } {
  const [h, m] = t.split(':').map(Number);
  return { hours: h, minutes: m };
}

/**
 * Compute end time for a slot given start time + either:
 *   - an explicit endTime string (HH:MM)
 *   - or a duration in minutes
 * Returns a Date.
 */
function computeEndTime(startDate: Date, endTimeStr: string | undefined, durationMins: number): Date {
  if (endTimeStr) {
    const { hours, minutes } = parseHHMM(endTimeStr);
    const end = new Date(startDate);
    end.setHours(hours, minutes, 0, 0);
    // If end is before start (e.g. crossing midnight), add a day
    if (end <= startDate) end.setDate(end.getDate() + 1);
    return end;
  }
  return new Date(startDate.getTime() + durationMins * 60000);
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'organiser' && session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const {
    title,
    date,
    time,
    endTime,
    duration = 30,
    bufferTime = 0,
    recurringType = 'NONE',
    recurringDays = [],
    slotCount,
    slotGap = 30,
  } = body;

  // Derive actual duration from endTime if not explicitly supplied
  let effectiveDuration: number = duration;
  if (endTime && time) {
    const { hours: sh, minutes: sm } = parseHHMM(time);
    const { hours: eh, minutes: em } = parseHHMM(endTime);
    const computed = (eh * 60 + em) - (sh * 60 + sm);
    if (computed > 0) effectiveDuration = computed;
  }

  const organiserId = session.user.id;

  const result = await prisma.$transaction(async (tx) => {
    // Create the service
    const service = await tx.service.create({
      data: {
        organiserId,
        title: title ?? `Voice Appointment ${Date.now()}`,
        durationMinutes: effectiveDuration,
        voiceCreated: true,
        // Auto-publish so users can see and book this appointment immediately
        isPublished: true,
        recurringType: recurringType ?? 'NONE',
        recurringDays: recurringDays.join(',') || null,
      },
    });

    const slots: any[] = [];

    if (recurringType === 'WEEKLY' && recurringDays.length > 0 && time) {
      // Generate slots for next 4 weeks
      const { hours: hour, minutes: min } = parseHHMM(time);
      const startFrom = new Date();
      for (let weekOffset = 0; weekOffset < 4; weekOffset++) {
        for (const day of recurringDays) {
          const targetDay = DAY_TO_NUM[day];
          const d = new Date(startFrom);
          const diff = (targetDay - d.getDay() + 7) % 7 + weekOffset * 7;
          d.setDate(d.getDate() + diff);
          d.setHours(hour, min, 0, 0);
          const end = computeEndTime(d, endTime, effectiveDuration);
          slots.push({ serviceId: service.id, userId: organiserId, startTime: d, endTime: end, capacity: 1 });
        }
      }
    } else if (slotCount && date && time) {
      // Multiple slots on a single day
      const { hours: hour, minutes: min } = parseHHMM(time);
      const base = new Date(date);
      base.setHours(hour, min, 0, 0);
      for (let i = 0; i < slotCount; i++) {
        const start = new Date(base.getTime() + i * slotGap * 60000);
        const end = new Date(start.getTime() + effectiveDuration * 60000);
        slots.push({ serviceId: service.id, userId: organiserId, startTime: start, endTime: end, capacity: 1 });
      }
    } else if (date && time) {
      // Single slot
      const { hours: hour, minutes: min } = parseHHMM(time);
      const start = new Date(date);
      start.setHours(hour, min, 0, 0);
      const end = computeEndTime(start, endTime, effectiveDuration);
      slots.push({ serviceId: service.id, userId: organiserId, startTime: start, endTime: end, capacity: 1 });
    }

    let slotsCreated = 0;
    if (slots.length > 0) {
      const res = await tx.providerSlot.createMany({ data: slots, skipDuplicates: true });
      slotsCreated = res.count;
    }

    return { service, slotsCreated };
  }, { timeout: 15000 });

  return NextResponse.json({ data: result }, { status: 201 });
}
