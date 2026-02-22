import db from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import crypto from 'crypto';

export default function handler(req, res) {
  const user = getSessionUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method === 'GET') {
    const events = db
      .prepare('SELECT * FROM events WHERE dj_id = ? ORDER BY created_at DESC')
      .all(user.id);
    return res.status(200).json({ events });
  }

  if (req.method === 'POST') {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Event name is required' });

    const slug = crypto.randomBytes(8).toString('hex');
    const result = db
      .prepare('INSERT INTO events (dj_id, name, description, slug) VALUES (?, ?, ?, ?)')
      .run(user.id, name, description || '', slug);

    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(result.lastInsertRowid);
    return res.status(201).json({ event });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
