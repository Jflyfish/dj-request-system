import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-04-22.dahlia',
});

export const PLATFORM_FEE_PCT = 0.1;  // 10% of tip goes to platform
export const SERVICE_FEE_CENTS = 50;  // flat $0.50 charged to guest to cover Stripe processing

export async function createTipPaymentIntent({
  tipCents,
  djStripeAccountId,
  songRequestId,
}: {
  tipCents: number;
  djStripeAccountId: string;
  songRequestId: string;
}) {
  // Guest pays tip + service fee. Platform application fee is 10% of the tip only.
  // Service fee stays on the platform side and covers Stripe's processing cost.
  const totalCharge = tipCents + SERVICE_FEE_CENTS;
  const applicationFee = Math.round(tipCents * PLATFORM_FEE_PCT) + SERVICE_FEE_CENTS;

  return stripe.paymentIntents.create({
    amount: totalCharge,
    currency: 'usd',
    application_fee_amount: applicationFee,
    transfer_data: {
      destination: djStripeAccountId,
    },
    metadata: { songRequestId },
  });
}

export async function createConnectAccountLink(stripeAccountId: string, baseUrl: string) {
  return stripe.accountLinks.create({
    account: stripeAccountId,
    refresh_url: `${baseUrl}/dj/settings?stripe=refresh`,
    return_url: `${baseUrl}/dj/settings?stripe=success`,
    type: 'account_onboarding',
  });
}
