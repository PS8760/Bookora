import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/prisma/prisma';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'organiser' && session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { titleSearch, time } = await request.json();
  if (!titleSearch || !time) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

  const service = await prisma.service.findFirst({
    where: {
      organiserId: session.user.id,
      title: { contains: titleSearch, mode: 'insensitive' },
      deletedAt: null,
    },
  });

  if (!service) return NextResponse.json({ error: 'Service not found' }, { status: 404 });

  const [hour, min] = time.split(':').map(Number);
  const futureSlots = await prisma.providerSlot.findMany({
    where: { serviceId: service.id, startTime: { gte: new Date() }, isActive: true },
  });

  let updatedCount = 0;
  for (const slot of futureSlots) {
    const newStart = new Date(slot.startTime);
    newStart.setHours(hour, min, 0, 0);
    const newEnd = new Date(newStart.getTime() + service.durationMinutes * 60000);
    await prisma.providerSlot.update({
      where: { id: slot.id },
      data: { startTime: newStart, endTime: newEnd },
    });
    updatedCount++;
  }

  return NextResponse.json({ data: { updatedSlots: updatedCount } });
}
