'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function NewEventPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [venue, setVenue] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { toast.error('Event name is required'); return; }
    setLoading(true);
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), venue: venue.trim() || undefined }),
    });
    if (res.ok) {
      router.push('/dj/dashboard');
    } else {
      const data = await res.json();
      toast.error(data.error ?? 'Failed to create event');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <header className="bg-zinc-900 border-b border-zinc-800">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center">
          <a href="/dj/dashboard" className="text-zinc-400 hover:text-white text-sm transition">← Dashboard</a>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-12">
        <h1 className="text-2xl font-black text-white mb-8">New Event</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Event name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              maxLength={200}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500"
              placeholder="Saturday Night Set"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Venue (optional)</label>
            <input
              type="text"
              value={venue}
              onChange={e => setVenue(e.target.value)}
              maxLength={200}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500"
              placeholder="Club XYZ, Chicago"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-bold rounded-xl transition-colors"
          >
            {loading ? 'Creating...' : 'Create Event'}
          </button>
        </form>
      </main>
    </div>
  );
}
