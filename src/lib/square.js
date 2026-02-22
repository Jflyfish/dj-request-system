export function getSquareConfig() {
  return {
    appId: process.env.SQUARE_APP_ID,
    locationId: process.env.SQUARE_LOCATION_ID,
    accessToken: process.env.SQUARE_ACCESS_TOKEN,
    baseUrl: process.env.SQUARE_ENV === 'production' ? 'https://connect.squareup.com' : 'https://connect.squareupsandbox.com',
  };
}

export async function createSquareCheckout({ amountCents, note }) {
  const { accessToken, baseUrl, locationId } = getSquareConfig();

  if (!accessToken || !locationId) {
    return {
      checkoutUrl: '',
      paymentId: `mock_${Date.now()}`,
      paymentStatus: 'pending',
      provider: 'mock',
    };
  }

  const response = await fetch(`${baseUrl}/v2/online-checkout/payment-links`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      idempotency_key: `${Date.now()}-${Math.random()}`,
      order: {
        location_id: locationId,
        line_items: [
          {
            name: 'DJ Request Tip',
            quantity: '1',
            base_price_money: {
              amount: amountCents,
              currency: 'USD',
            },
            note,
          },
        ],
      },
      checkout_options: {
        ask_for_shipping_address: false,
      },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Square request failed: ${err}`);
  }

  const data = await response.json();
  return {
    checkoutUrl: data.payment_link?.url,
    paymentId: data.payment_link?.id,
    paymentStatus: 'pending',
    provider: 'square',
  };
}
