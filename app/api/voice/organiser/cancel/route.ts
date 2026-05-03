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

  const { titleSearch, scope = 'ALL', date } = await request.json();
  if (!titleSearch) return NextResponse.json({ error: 'Missing title' }, { status: 400 });

  const service = await prisma.service.findFirst({
    where: {
      organiserId: session.user.id,
      title: { contains: titleSearch, mode: 'insensitive' },
      deletedAt: null,
    },
  });

  if (!service) return NextResponse.json({ error: 'Service not found' }, { status: 404 });

  const where: any = { serviceId: service.id, isActive: true, startTime: { gte: new Date() } };
  if (scope === 'SINGLE' && date) {
    const d = new Date(date);
    const next = new Date(d);
    next.setDate(next.getDate() + 1);
    where.startTime = { gte: d, lt: next };
  }

  const result = await prisma.providerSlot.updateMany({ where, data: { isActive: false } });
  return NextResponse.json({ data: { cancelledSlots: result.count } });
}
