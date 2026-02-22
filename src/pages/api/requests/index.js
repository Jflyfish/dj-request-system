import db from '@/lib/db';
import { allowRequest } from '@/lib/rateLimit';
import { getSessionUser } from '@/lib/auth';

export default function handler(req, res) {
  if (req.method === 'GET') {
    const user = getSessionUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { eventId, sort = 'time' } = req.query;
    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
    if (!event || event.dj_id !== user.id) return res.status(404).json({ error: 'Event not found' });

    const orderClause = sort === 'tip' ? 'tip_amount DESC, created_at DESC' : 'created_at DESC';
    const requests = db
      .prepare(`SELECT * FROM requests WHERE event_id = ? ORDER BY ${orderClause}`)
      .all(eventId);

    return res.status(200).json({ requests });
  }

  if (req.method === 'POST') {
    const { eventSlug, songName, artist, guestMessage, tipAmount, paymentStatus = 'none' } = req.body;
    const clientKey = `${req.headers['x-forwarded-for'] || req.socket.remoteAddress}:${eventSlug}`;
    if (!allowRequest(clientKey)) {
      return res.status(429).json({ error: 'Too many requests. Please wait a minute.' });
    }

    const event = db.prepare('SELECT * FROM events WHERE slug = ?').get(eventSlug);
    if (!event || event.status !== 'live') return res.status(404).json({ error: 'Event unavailable' });

    if (!songName || !artist) return res.status(400).json({ error: 'Song and artist required' });

    const result = db.prepare(
      `INSERT INTO requests (event_id, song_name, artist, guest_message, tip_amount, payment_status)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(event.id, songName, artist, guestMessage || '', Number(tipAmount || 0), paymentStatus);

    const request = db.prepare('SELECT * FROM requests WHERE id = ?').get(result.lastInsertRowid);
    return res.status(201).json({ request });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
