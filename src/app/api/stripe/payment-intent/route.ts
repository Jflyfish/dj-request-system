import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createTipPaymentIntent } from '@/lib/stripe';
import { z } from 'zod';

const schema = z.object({
  eventId: z.string(),
  songRequestData: z.object({
    songTitle: z.string(),
    artistName: z.string(),
    albumArt: z.string().optional(),
    requesterName: z.string().optional(),
    message: z.string().optional(),
    bpm: z.number().int().optional(),
    musicalKey: z.string().optional(),
  }),
  tipCents: z.number().int().min(100),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const event = await prisma.event.findUnique({
    where: { id: parsed.data.eventId },
    include: { djProfile: true },
  });

  if (!event || !event.isActive) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }
  if (!event.djProfile.stripeOnboarded || !event.djProfile.stripeAccountId) {
    return NextResponse.json({ error: 'DJ tips not enabled' }, { status: 400 });
  }

  // Create a placeholder request first to get the ID for metadata
  const maxPos = await prisma.songRequest.aggregate({
    where: { eventId: parsed.data.eventId },
    _max: { position: true },
  });
  const request = await prisma.songRequest.create({
    data: {
      eventId: parsed.data.eventId,
      position: (maxPos._max.position ?? -1) + 1,
      tipCents: parsed.data.tipCents,
      ...parsed.data.songRequestData,
    },
  });

  const intent = await createTipPaymentIntent({
    tipCents: parsed.data.tipCents,
    djStripeAccountId: event.djProfile.stripeAccountId!,
    songRequestId: request.id,
  });

  return NextResponse.json({
    clientSecret: intent.client_secret,
    requestId: request.id,
  });
}
