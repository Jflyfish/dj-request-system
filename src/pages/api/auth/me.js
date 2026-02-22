import { getSessionUser } from '@/lib/auth';

export default function handler(req, res) {
  const user = getSessionUser(req);
  if (!user) return res.status(401).json({ user: null });
  res.status(200).json({ user });
}
