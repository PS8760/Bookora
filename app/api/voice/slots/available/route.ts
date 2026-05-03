import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/prisma/prisma';
import { sendBookingConfirmationEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  const organiserId = searchParams.get('organiserId');
  const serviceId = searchParams.get('serviceId');

  const where: any = { isActive: true, startTime: { gte: new Date() } };
  where.booked = { lt: prisma.providerSlot.fields.capacity };

  if (date) {
    const d = new Date(date);
    const next = new Date(d); next.setDate(next.getDate() + 1);
    where.startTime = { gte: d, lt: next };
  }
  if (organiserId) where.userId = organiserId;
  if (serviceId) where.serviceId = serviceId;

  const slots = await prisma.providerSlot.findMany({
    where,
    include: {
      service: { select: { title: true, durationMinutes: true, organiserId: true } },
      user: { select: { name: true, email: true } },
    },
    orderBy: { startTime: 'asc' },
    take: 20,
  });

  // Filter booked < capacity in JS since Prisma doesn't support cross-field comparison in where
  const available = slots.filter(s => s.booked < s.capacity);

  return NextResponse.json({ data: available });
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { slotId, notes, date, time, organiserName, bookNext } = body;
  const customerId = session.user.id;

  // Find slot
  let slot: any = null;

  if (slotId) {
    slot = await prisma.providerSlot.findFirst({
      where: { id: slotId, isActive: true },
      include: { service: true },
    });
  } else if (bookNext || (date && !slotId)) {
    const where: any = {
      isActive: true,
      startTime: { gte: new Date() },
    };

    if (date && time) {
      const [h, m] = time.split(':').map(Number);
      const d = new Date(date);
      d.setHours(h, m, 0, 0);
      const end = new Date(d.getTime() + 2 * 60 * 60000);
      where.startTime = { gte: d, lt: end };
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

    slot = await prisma.providerSlot.findFirst({
      where,
      include: { service: true },
      orderBy: { startTime: 'asc' },
    });
  }

  if (!slot) return NextResponse.json({ error: { code: 'SLOT_NOT_FOUND', message: 'No available slot found' } }, { status: 404 });
  if (slot.booked >= slot.capacity) return NextResponse.json({ error: { code: 'CAPACITY_EXCEEDED', message: 'Slot is full' } }, { status: 409 });

  const booking = await prisma.$transaction(async (tx) => {
    await tx.providerSlot.update({ where: { id: slot.id }, data: { booked: { increment: 1 } } });
    return tx.booking.create({
      data: {
        customerId,
        serviceId: slot.serviceId,
        providerSlotId: slot.id,
        userId: slot.userId,
        notes: notes ?? null,
        status: slot.service?.manualConfirm ? 'PENDING' : 'CONFIRMED',
      },
    });
  }, { timeout: 15000 });

  // Send confirmation email
  if (session.user.email) {
    try {
      await sendBookingConfirmationEmail({
        to: session.user.email,
        customerName: session.user.name ?? 'Customer',
        serviceName: slot.service?.title ?? 'Appointment',
        startTime: slot.startTime,
        bookingId: booking.id,
      });
    } catch (e) { console.error('Email failed:', e); }
  }

  return NextResponse.json({ data: booking }, { status: 201 });
}
