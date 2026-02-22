import db from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export default function handler(req, res) {
  if (req.method !== 'PATCH') return res.status(405).json({ error: 'Method not allowed' });

  const user = getSessionUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { id } = req.query;
  const { status } = req.body;
  const request = db.prepare('SELECT * FROM requests WHERE id = ?').get(id);
  if (!request) return res.status(404).json({ error: 'Request not found' });

  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(request.event_id);
  if (!event || event.dj_id !== user.id) return res.status(403).json({ error: 'Forbidden' });

  db.prepare(
    'UPDATE requests SET status = ?, played_at = CASE WHEN ? = "played" THEN CURRENT_TIMESTAMP ELSE played_at END WHERE id = ?'
  ).run(status, status, id);

  const updated = db.prepare('SELECT * FROM requests WHERE id = ?').get(id);
  return res.status(200).json({ request: updated });
}
