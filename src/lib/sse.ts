// In-memory SSE subscriber registry per eventId
// In production, replace with Redis pub/sub for multi-instance deployments

type Subscriber = (data: string) => void;

const subscribers = new Map<string, Set<Subscriber>>();

export function subscribe(eventId: string, fn: Subscriber): () => void {
  if (!subscribers.has(eventId)) subscribers.set(eventId, new Set());
  subscribers.get(eventId)!.add(fn);
  return () => {
    subscribers.get(eventId)?.delete(fn);
    if (subscribers.get(eventId)?.size === 0) subscribers.delete(eventId);
  };
}

export function broadcast(eventId: string, payload: unknown) {
  const data = JSON.stringify(payload);
  subscribers.get(eventId)?.forEach(fn => fn(data));
}
