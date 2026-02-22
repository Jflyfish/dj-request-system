import { createSquareCheckout } from '@/lib/square';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { tipAmount, songName } = req.body;
  const amountCents = Math.round(Number(tipAmount || 0) * 100);

  if (!amountCents || amountCents < 100) {
    return res.status(400).json({ error: 'Tip must be at least $1.00' });
  }

  try {
    const checkout = await createSquareCheckout({
      amountCents,
      note: `Tip for request: ${songName || 'Song request'}`,
    });
    return res.status(200).json(checkout);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
