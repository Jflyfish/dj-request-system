import db from '@/lib/db';
import { createSessionCookie, hashPassword } from '@/lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, password } = req.body;
  if (!email || !password || password.length < 8) {
    return res.status(400).json({ error: 'Valid email and 8+ char password required' });
  }

  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
  if (exists) return res.status(409).json({ error: 'Email already registered' });

  const passwordHash = await hashPassword(password);
  const result = db
    .prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)')
    .run(email.toLowerCase(), passwordHash);

  const user = { id: result.lastInsertRowid, email: email.toLowerCase() };
  res.setHeader('Set-Cookie', createSessionCookie(user));
  return res.status(201).json({ user });
}
