import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { z } from 'zod';

const updateSchema = z.object({
  status: z.enum(['PENDING', 'PLAYING', 'PLAYED', 'REJECTED']).optional(),
  position: z.number().int().min(0).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { requestId: string } }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const request = await prisma.songRequest.update({
    where: { id: params.requestId },
    data: parsed.data,
  });

  try {
    const { broadcast } = await import('@/lib/sse');
    broadcast(request.eventId, { type: 'update_request', request });
  } catch {}

  return NextResponse.json(request);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { requestId: string } }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const request = await prisma.songRequest.findUnique({ where: { id: params.requestId } });
  if (!request) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await prisma.songRequest.delete({ where: { id: params.requestId } });

  try {
    const { broadcast } = await import('@/lib/sse');
    broadcast(request.eventId, { type: 'delete_request', requestId: params.requestId });
  } catch {}

  return NextResponse.json({ ok: true });
}
