import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/prisma/prisma';
import { sendBookingConfirmationEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { slotId, notes, date, time, organiserName, bookNext } = body;
  const customerId = session.user.id;

  let slot: any = null;

  if (slotId) {
    slot = await prisma.providerSlot.findFirst({ where: { id: slotId, isActive: true }, include: { service: true } });
  } else {
    const where: any = { isActive: true, startTime: { gte: new Date() } };

    if (date && time) {
      const [h, m] = time.split(':').map(Number);
      const d = new Date(date); d.setHours(h, m, 0, 0);
      const windowEnd = new Date(d.getTime() + 2 * 60 * 60000);
      where.startTime = { gte: d, lt: windowEnd };
    } else if (date) {
      const d = new Date(date);
      const next = new Date(d); next.setDate(next.getDate() + 1);
      where.startTime = { gte: d, lt: next };
    }

    if (organiserName) {
      const organiser = await prisma.user.findFirst({
        where: { name: { contains: organiserName, mode: 'insensitive' }, role: 'organiser' },
      });
      if (organiser) where.userId = organiser.id;
    }

    slot = await prisma.providerSlot.findFirst({ where, include: { service: true }, orderBy: { startTime: 'asc' } });
  }

  if (!slot) return NextResponse.json({ error: { code: 'SLOT_NOT_FOUND', message: 'No available slot found' } }, { status: 404 });
  if (slot.booked >= slot.capacity) return NextResponse.json({ error: { code: 'CAPACITY_EXCEEDED', message: 'Slot is fully booked' } }, { status: 409 });

  const booking = await prisma.$transaction(async (tx) => {
    await tx.providerSlot.update({ where: { id: slot.id }, data: { booked: { increment: 1 } } });
    return tx.booking.create({
      data: {
        customerId,
        serviceId: slot.serviceId,
        providerSlotId: slot.id,
        userId: slot.userId ?? null,
        notes: notes ?? null,
        status: slot.service?.manualConfirm ? 'PENDING' : 'CONFIRMED',
      },
    });
  }, { timeout: 15000 });

  if (session.user.email) {
    sendBookingConfirmationEmail({
      to: session.user.email,
      customerName: session.user.name ?? 'Customer',
      serviceName: slot.service?.title ?? 'Appointment',
      startTime: slot.startTime,
      bookingId: booking.id,
    }).catch(console.error);
  }

  return NextResponse.json({ data: booking }, { status: 201 });
}
