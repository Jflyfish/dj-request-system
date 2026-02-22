import db from '@/lib/db';
import { createSessionCookie, verifyPassword } from '@/lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get((email || '').toLowerCase());
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const ok = await verifyPassword(password || '', user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

  res.setHeader('Set-Cookie', createSessionCookie({ id: user.id, email: user.email }));
  return res.status(200).json({ user: { id: user.id, email: user.email } });
}
