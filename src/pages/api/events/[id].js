import db from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export default function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'GET') {
    const event = db.prepare('SELECT * FROM events WHERE id = ? OR slug = ?').get(id, id);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    return res.status(200).json({ event });
  }

  const user = getSessionUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(id);
  if (!event || event.dj_id !== user.id) return res.status(404).json({ error: 'Event not found' });

  if (req.method === 'PATCH') {
    const { name, description, status } = req.body;
    db.prepare(
      'UPDATE events SET name = ?, description = ?, status = ?, ended_at = CASE WHEN ? = "ended" THEN CURRENT_TIMESTAMP ELSE ended_at END WHERE id = ?'
    ).run(name || event.name, description ?? event.description, status || event.status, status || event.status, id);

    const updated = db.prepare('SELECT * FROM events WHERE id = ?').get(id);
    return res.status(200).json({ event: updated });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
