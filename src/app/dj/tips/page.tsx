'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface TipRequest {
  id: string;
  songTitle: string;
  artistName: string;
  albumArt?: string | null;
  requesterName?: string | null;
  tipCents: number;
  status: string;
  createdAt: string;
  eventName: string;
}

interface EventStat {
  id: string;
  name: string;
  venue?: string | null;
  isActive: boolean;
  createdAt: string;
  tipCount: number;
  grossCents: number;
  netCents: number;
}

interface TipsData {
  totalGrossCents: number;
  totalNetCents: number;
  totalTipCount: number;
  platformFeePct: number;
  events: EventStat[];
  recentTips: TipRequest[];
}

function fmt(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function TipsDashboard() {
  const [data, setData] = useState<TipsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dj/tips')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-400">Loading...</div>
      </div>
    );
  }

  if (!data) return null;

  const feeMultiplier = data.platformFeePct / 100;

  return (
    <div className="min-h-screen bg-zinc-950">
      <header className="bg-zinc-900 border-b border-zinc-800 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/dj/dashboard" className="text-zinc-400 hover:text-white text-sm transition">
            ← Dashboard
          </Link>
          <span className="text-white font-bold">Tip Dashboard</span>
          <div className="w-20" />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <p className="text-zinc-400 text-xs font-medium uppercase tracking-wider mb-1">Total earned (net)</p>
            <p className="text-3xl font-black text-white">{fmt(data.totalNetCents)}</p>
            <p className="text-zinc-500 text-xs mt-1">after {data.platformFeePct}% platform fee</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <p className="text-zinc-400 text-xs font-medium uppercase tracking-wider mb-1">Gross tips</p>
            <p className="text-3xl font-black text-violet-400">{fmt(data.totalGrossCents)}</p>
            <p className="text-zinc-500 text-xs mt-1">
              {fmt(Math.round(data.totalGrossCents * feeMultiplier))} platform fee
            </p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <p className="text-zinc-400 text-xs font-medium uppercase tracking-wider mb-1">Total tips</p>
            <p className="text-3xl font-black text-white">{data.totalTipCount}</p>
            <p className="text-zinc-500 text-xs mt-1">
              across {data.events.filter(e => e.tipCount > 0).length} event{data.events.filter(e => e.tipCount > 0).length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* No tips yet */}
        {data.totalTipCount === 0 && (
          <div className="text-center py-16 bg-zinc-900 border border-zinc-800 border-dashed rounded-2xl">
            <p className="text-4xl mb-3">💸</p>
            <p className="text-white font-bold mb-1">No tips yet</p>
            <p className="text-zinc-400 text-sm">Connect Stripe and tips will appear here as they come in.</p>
            <Link href="/dj/settings" className="mt-4 inline-block text-violet-400 hover:text-violet-300 text-sm transition">
              Set up payouts →
            </Link>
          </div>
        )}

        {/* Recent tips feed */}
        {data.recentTips.length > 0 && (
          <div>
            <h2 className="text-white font-bold text-lg mb-4">Recent tips</h2>
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl divide-y divide-zinc-800">
              {data.recentTips.map(tip => (
                <div key={tip.id} className="flex items-center gap-3 px-4 py-3">
                  {tip.albumArt ? (
                    <img src={tip.albumArt} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-zinc-800 flex-shrink-0 flex items-center justify-center text-zinc-500 text-lg">♪</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{tip.songTitle}</p>
                    <p className="text-zinc-400 text-xs truncate">
                      {tip.artistName}
                      {tip.requesterName ? ` · from ${tip.requesterName}` : ''}
                    </p>
                    <p className="text-zinc-600 text-xs">{tip.eventName} · {timeAgo(tip.createdAt)}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-violet-300 font-bold text-sm">{fmt(tip.tipCents)}</p>
                    <p className="text-zinc-600 text-xs">{fmt(Math.round(tip.tipCents * (1 - feeMultiplier)))} net</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Per-event breakdown */}
        {data.events.some(e => e.tipCount > 0) && (
          <div>
            <h2 className="text-white font-bold text-lg mb-4">By event</h2>
            <div className="space-y-3">
              {data.events.filter(e => e.tipCount > 0).map(event => (
                <div key={event.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-white font-semibold truncate">{event.name}</p>
                        {event.isActive && (
                          <span className="flex items-center gap-1 text-xs text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full flex-shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                            Live
                          </span>
                        )}
                      </div>
                      {event.venue && <p className="text-zinc-500 text-xs">{event.venue}</p>}
                      <p className="text-zinc-500 text-xs mt-0.5">
                        {event.tipCount} tip{event.tipCount !== 1 ? 's' : ''} · {new Date(event.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-white font-bold">{fmt(event.netCents)} <span className="text-zinc-500 text-xs font-normal">net</span></p>
                      <p className="text-zinc-500 text-xs">{fmt(event.grossCents)} gross</p>
                    </div>
                  </div>

                  {/* Mini bar showing gross vs net */}
                  <div className="mt-3 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-violet-500 rounded-full"
                      style={{ width: `${((event.netCents / event.grossCents) * 100).toFixed(1)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-zinc-600 text-xs mt-1">
                    <span>You keep {100 - data.platformFeePct}%</span>
                    <span>{data.platformFeePct}% fee</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
