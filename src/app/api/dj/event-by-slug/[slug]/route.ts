import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const djProfile = await prisma.dJProfile.findUnique({
    where: { slug: params.slug },
  });
  if (!djProfile) {
    return NextResponse.json({ error: 'DJ not found' }, { status: 404 });
  }

  const event = await prisma.event.findFirst({
    where: { djProfileId: djProfile.id, isActive: true },
    orderBy: { createdAt: 'desc' },
    include: {
      djProfile: {
        select: {
          displayName: true,
          tipEnabled: true,
          requireTip: true,
          minTipCents: true,
          stripeOnboarded: true,
        },
      },
    },
  });

  if (!event) {
    return NextResponse.json({ error: 'No active event' }, { status: 404 });
  }

  return NextResponse.json({ event });
}
