import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createSchema = z.object({
  songTitle: z.string().min(1).max(200),
  artistName: z.string().min(1).max(200),
  albumArt: z.string().url().optional(),
  requesterName: z.string().max(100).optional(),
  message: z.string().max(300).optional(),
  tipCents: z.number().int().min(0).default(0),
  stripePaymentId: z.string().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  const requests = await prisma.songRequest.findMany({
    where: { eventId: params.eventId, status: { in: ['PENDING', 'PLAYING'] } },
    orderBy: [{ position: 'asc' }, { tipCents: 'desc' }, { createdAt: 'asc' }],
  });
  return NextResponse.json(requests);
}

export async function POST(
  req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const event = await prisma.event.findUnique({
    where: { id: params.eventId },
    include: { djProfile: true },
  });
  if (!event || !event.isActive) {
    return NextResponse.json({ error: 'Event not found or inactive' }, { status: 404 });
  }

  const maxPos = await prisma.songRequest.aggregate({
    where: { eventId: params.eventId },
    _max: { position: true },
  });
  const position = (maxPos._max.position ?? -1) + 1;

  const request = await prisma.songRequest.create({
    data: {
      eventId: params.eventId,
      position,
      ...parsed.data,
    },
  });

  // Broadcast SSE update
  try {
    const { broadcast } = await import('@/lib/sse');
    broadcast(params.eventId, { type: 'new_request', request });
  } catch {}

  return NextResponse.json(request, { status: 201 });
}
