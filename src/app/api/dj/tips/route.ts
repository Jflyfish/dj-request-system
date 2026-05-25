import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const djProfile = await prisma.dJProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true, platformFeePct: true },
  });
  if (!djProfile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  const events = await prisma.event.findMany({
    where: { djProfileId: djProfile.id },
    orderBy: { createdAt: 'desc' },
    include: {
      requests: {
        where: { tipCents: { gt: 0 } },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          songTitle: true,
          artistName: true,
          albumArt: true,
          requesterName: true,
          tipCents: true,
          status: true,
          createdAt: true,
        },
      },
    },
  });

  const feePct = djProfile.platformFeePct / 100;

  const eventStats = events.map(event => {
    const gross = event.requests.reduce((sum, r) => sum + r.tipCents, 0);
    const net = Math.round(gross * (1 - feePct));
    return {
      id: event.id,
      name: event.name,
      venue: event.venue,
      isActive: event.isActive,
      createdAt: event.createdAt,
      tipCount: event.requests.length,
      grossCents: gross,
      netCents: net,
      requests: event.requests,
    };
  });

  const totalGross = eventStats.reduce((sum, e) => sum + e.grossCents, 0);
  const totalNet = eventStats.reduce((sum, e) => sum + e.netCents, 0);
  const totalTipCount = eventStats.reduce((sum, e) => sum + e.tipCount, 0);

  const recentTips = events
    .flatMap(e => e.requests.map(r => ({ ...r, eventName: e.name })))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 20);

  return NextResponse.json({
    totalGrossCents: totalGross,
    totalNetCents: totalNet,
    totalTipCount,
    platformFeePct: djProfile.platformFeePct,
    events: eventStats,
    recentTips,
  });
}
