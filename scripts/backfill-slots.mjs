/**
 * Backfill script: adds a Mon–Fri 9am–6pm weekly schedule to every published
 * service that currently has NO schedule, then generates slots for the next 60 days.
 *
 * Run once with:  node scripts/backfill-slots.mjs
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function generateSlots(serviceId) {
  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    include: { schedules: { include: { weeklyRules: true, flexibleDays: true } } },
  });
  if (!service || service.schedules.length === 0) return 0;

  const fromDate = new Date();
  const toDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
  const slotMs = service.durationMinutes * 60 * 1000;
  const candidates = [];

  for (const schedule of service.schedules) {
    if (schedule.type === "WEEKLY") {
      const cursor = new Date(fromDate);
      cursor.setUTCHours(0, 0, 0, 0);
      while (cursor <= toDate) {
        const dow = cursor.getUTCDay();
        const dayRules = schedule.weeklyRules.filter((r) => r.dayOfWeek === dow);
        for (const rule of dayRules) {
          const windowStart = new Date(cursor);
          windowStart.setUTCHours(0, rule.startMinute, 0, 0);
          const windowEnd = new Date(cursor);
          windowEnd.setUTCHours(0, rule.endMinute, 0, 0);
          let slotStart = new Date(windowStart);
          while (slotStart.getTime() + slotMs <= windowEnd.getTime()) {
            const slotEnd = new Date(slotStart.getTime() + slotMs);
            candidates.push({
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
  }

  if (candidates.length === 0) return 0;

  const result = await prisma.providerSlot.createMany({ data: candidates, skipDuplicates: true });
  return result.count;
}

async function main() {
  // 1. Find all published services without any schedules
  const services = await prisma.service.findMany({
    where: { deletedAt: null, isPublished: true },
    include: { schedules: true },
  });

  const noSchedule = services.filter((s) => s.schedules.length === 0);
  console.log(`\nFound ${services.length} published services.`);
  console.log(`  → ${noSchedule.length} have NO schedule → will backfill.\n`);

  for (const svc of noSchedule) {
    console.log(`  [${svc.id}] "${svc.title}" — creating schedule...`);

    await prisma.schedule.create({
      data: {
        serviceId: svc.id,
        type: "WEEKLY",
        weeklyRules: {
          create: [1, 2, 3, 4, 5].map((day) => ({
            dayOfWeek: day,
            startMinute: 9 * 60,  // 09:00 UTC
            endMinute: 18 * 60,   // 18:00 UTC
          })),
        },
      },
    });

    const count = await generateSlots(svc.id);
    console.log(`     ✓ Schedule created, ${count} slots generated.`);
  }

  // 2. Also regenerate for published services that DO have schedules but 0 future slots
  const withSchedule = services.filter((s) => s.schedules.length > 0);
  for (const svc of withSchedule) {
    const futureSlotCount = await prisma.providerSlot.count({
      where: { serviceId: svc.id, startTime: { gt: new Date() }, isActive: true },
    });
    if (futureSlotCount === 0) {
      console.log(`  [${svc.id}] "${svc.title}" — has schedule but 0 future slots → regenerating...`);
      const count = await generateSlots(svc.id);
      console.log(`     ✓ ${count} slots generated.`);
    }
  }

  const total = await prisma.providerSlot.count({ where: { startTime: { gt: new Date() }, isActive: true } });
  console.log(`\nDone! Total active future slots in DB: ${total}\n`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
