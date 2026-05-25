import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { stripe, createConnectAccountLink } from '@/lib/stripe';

export async function POST() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL!;

  const djProfile = await prisma.dJProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!djProfile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  let stripeAccountId = djProfile.stripeAccountId;

  try {
    if (!stripeAccountId) {
      const account = await stripe.accounts.create({ type: 'express' });
      stripeAccountId = account.id;
      await prisma.dJProfile.update({
        where: { id: djProfile.id },
        data: { stripeAccountId },
      });
    }

    const link = await createConnectAccountLink(stripeAccountId, baseUrl);
    return NextResponse.json({ url: link.url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Stripe error';
    const isConnectNotEnabled = message.includes('signed up for Connect');
    return NextResponse.json(
      { error: isConnectNotEnabled
        ? 'Stripe Connect is not enabled on your account. Visit dashboard.stripe.com/connect to enable it.'
        : message },
      { status: 400 }
    );
  }
}
