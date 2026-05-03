import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/prisma/prisma';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { bookingId, newSlotId, titleSearch, newDate, newTime } = await request.json();
  const userId = session.user.id;

  let booking: any = bookingId
    ? await prisma.booking.findFirst({ where: { id: bookingId, customerId: userId }, include: { providerSlot: true } })
    : null;

  if (!booking && titleSearch) {
    booking = await prisma.booking.findFirst({
      where: {
        customerId: userId,
        status: { in: ['PENDING', 'CONFIRMED'] },
        service: { title: { contains: titleSearch, mode: 'insensitive' } },
      },
      include: { providerSlot: true, service: true },
    });
  }

  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

  let newSlot: any = newSlotId ? await prisma.providerSlot.findFirst({ where: { id: newSlotId, isActive: true } }) : null;

  if (!newSlot && newDate && newTime) {
    const [h, m] = newTime.split(':').map(Number);
    const d = new Date(newDate); d.setHours(h, m, 0, 0);
    const windowEnd = new Date(d.getTime() + 2 * 60 * 60000);
    newSlot = await prisma.providerSlot.findFirst({
      where: { serviceId: booking.serviceId, isActive: true, startTime: { gte: d, lt: windowEnd } },
      orderBy: { startTime: 'asc' },
    });
  }

  if (!newSlot) return NextResponse.json({ error: 'New slot not found' }, { status: 404 });
  if (newSlot.booked >= newSlot.capacity) return NextResponse.json({ error: 'New slot is full' }, { status: 409 });

  const updated = await prisma.$transaction(async (tx) => {
    await tx.providerSlot.update({ where: { id: booking.providerSlotId }, data: { booked: { decrement: 1 } } });
    await tx.providerSlot.update({ where: { id: newSlot.id }, data: { booked: { increment: 1 } } });
    return tx.booking.update({
      where: { id: booking.id },
      data: { providerSlotId: newSlot.id, status: 'RESCHEDULED', updatedAt: new Date() },
    });
  }, { timeout: 15000 });

  return NextResponse.json({ data: updated });
}
