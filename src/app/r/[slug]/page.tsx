'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import confetti from 'canvas-confetti';
import { toast } from 'sonner';
import { ItunesTrack } from '@/lib/itunes';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const SERVICE_FEE_CENTS = 50;

interface SongRequest {
  id: string;
  songTitle: string;
  artistName: string;
  albumArt?: string;
  requesterName?: string;
  tipCents: number;
  status: string;
  createdAt: string;
}

interface DJEvent {
  id: string;
  name: string;
  venue?: string;
  djProfile: {
    displayName: string;
    tipEnabled: boolean;
    requireTip: boolean;
    minTipCents: number;
    stripeOnboarded: boolean;
  };
}

const TIP_PRESETS = [0, 100, 200, 500, 1000];

function formatCents(cents: number) {
  return cents === 0 ? 'No tip' : `$${(cents / 100).toFixed(2)}`;
}

function CheckoutForm({
  onSuccess,
}: {
  clientSecret: string;
  requestId: string;
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    const { error } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    });
    if (error) {
      toast.error(error.message ?? 'Payment failed');
    } else {
      onSuccess();
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <button
        type="submit"
        disabled={loading || !stripe}
        className="w-full py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-bold rounded-xl transition-colors"
      >
        {loading ? 'Processing...' : 'Send Request + Tip'}
      </button>
    </form>
  );
}

export default function RequesterPage({ params }: { params: { slug: string } }) {
  const [djEvent, setDjEvent] = useState<DJEvent | null>(null);
  const [queue, setQueue] = useState<SongRequest[]>([]);
  const [step, setStep] = useState<'search' | 'tip' | 'pay' | 'done'>('search');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ItunesTrack[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<ItunesTrack | null>(null);
  const [tipCents, setTipCents] = useState(0);
  const [customTip, setCustomTip] = useState('');
  const [requesterName, setRequesterName] = useState('');
  const [message, setMessage] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [requestId, setRequestId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [eventId, setEventId] = useState('');
  const [bpm, setBpm] = useState<number | null>(null);
  const [musicalKey, setMusicalKey] = useState<string | null>(null);
  const searchRef = useRef<ReturnType<typeof setTimeout>>();

  // Load event by DJ slug
  useEffect(() => {
    fetch(`/api/dj/event-by-slug/${params.slug}`)
      .then(r => r.json())
      .then(data => {
        if (data.event) {
          setDjEvent(data.event);
          setEventId(data.event.id);
          loadQueue(data.event.id);
          subscribeSSE(data.event.id);
        }
      });
  }, [params.slug]);

  function loadQueue(eid: string) {
    fetch(`/api/events/${eid}/requests`)
      .then(r => r.json())
      .then(setQueue);
  }

  function subscribeSSE(eid: string) {
    const es = new EventSource(`/api/sse/${eid}`);
    es.onmessage = (e) => {
      const payload = JSON.parse(e.data);
      if (payload.type === 'new_request') {
        setQueue(q => [...q, payload.request]);
      } else if (payload.type === 'update_request') {
        setQueue(q => q.map(r => r.id === payload.request.id ? payload.request : r));
      } else if (payload.type === 'delete_request') {
        setQueue(q => q.filter(r => r.id !== payload.requestId));
      }
    };
    return () => es.close();
  }

  const doSearch = useCallback((q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setSearching(true);
    fetch(`/api/songs?q=${encodeURIComponent(q)}`)
      .then(r => r.json())
      .then(data => { setResults(data); setSearching(false); });
  }, []);

  function handleQueryChange(v: string) {
    setQuery(v);
    clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => doSearch(v), 400);
  }

  function selectTrack(track: ItunesTrack) {
    setSelected(track);
    setResults([]);
    setQuery('');
    setStep('tip');
    setBpm(null);
    setMusicalKey(null);
    fetch(`/api/spotify/audio-features?title=${encodeURIComponent(track.trackName)}&artist=${encodeURIComponent(track.artistName)}`)
      .then(r => r.json())
      .then(data => {
        if (data.bpm) setBpm(data.bpm);
        if (data.musicalKey) setMusicalKey(data.musicalKey);
      })
      .catch(() => {});
  }

  const activeTip = customTip ? Math.round(parseFloat(customTip) * 100) : tipCents;

  async function handleSubmitRequest() {
    if (!selected || !eventId) return;
    setSubmitting(true);

    const needsPayment = activeTip > 0 && djEvent?.djProfile.stripeOnboarded;

    if (needsPayment) {
      const res = await fetch('/api/stripe/payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          tipCents: activeTip,
          songRequestData: {
            songTitle: selected.trackName,
            artistName: selected.artistName,
            albumArt: selected.artworkUrl100,
            requesterName: requesterName || undefined,
            message: message || undefined,
            bpm: bpm ?? undefined,
            musicalKey: musicalKey ?? undefined,
          },
        }),
      });
      const data = await res.json();
      if (data.clientSecret) {
        setClientSecret(data.clientSecret);
        setRequestId(data.requestId);
        setStep('pay');
      } else {
        toast.error('Could not start payment');
      }
    } else {
      // Free request
      await fetch(`/api/events/${eventId}/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          songTitle: selected.trackName,
          artistName: selected.artistName,
          albumArt: selected.artworkUrl100,
          requesterName: requesterName || undefined,
          message: message || undefined,
          tipCents: 0,
          bpm: bpm ?? undefined,
          musicalKey: musicalKey ?? undefined,
        }),
      });
      handleSuccess();
    }
    setSubmitting(false);
  }

  function handleSuccess() {
    confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
    setStep('done');
  }

  if (!djEvent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="text-zinc-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-b from-violet-950/60 to-zinc-950 px-4 pt-10 pb-8 text-center">
        <div className="w-16 h-16 bg-violet-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
        </div>
        <h1 className="text-2xl font-black text-white">{djEvent.djProfile.displayName}</h1>
        <p className="text-zinc-400 text-sm mt-1">{djEvent.name}{djEvent.venue ? ` · ${djEvent.venue}` : ''}</p>
      </div>

      <div className="max-w-md mx-auto px-4 space-y-6">
        {/* Step: Search */}
        {step === 'search' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white">Request a song</h2>
            <div className="relative">
              <input
                type="text"
                value={query}
                onChange={e => handleQueryChange(e.target.value)}
                placeholder="Search by song or artist..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500 pr-10"
              />
              {searching && (
                <div className="absolute right-3 top-3.5 w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
              )}
            </div>
            {results.length > 0 && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden divide-y divide-zinc-800">
                {results.map(track => (
                  <button
                    key={track.trackId}
                    onClick={() => selectTrack(track)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-800 transition-colors text-left"
                  >
                    <img
                      src={track.artworkUrl100}
                      alt=""
                      className="w-10 h-10 rounded-lg flex-shrink-0 object-cover"
                    />
                    <div className="min-w-0">
                      <p className="text-white text-sm font-medium truncate">{track.trackName}</p>
                      <p className="text-zinc-400 text-xs truncate">{track.artistName}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Live queue preview */}
            {queue.filter(r => r.status === 'PENDING').length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-zinc-400 mb-2">Up next</h3>
                <div className="space-y-2">
                  {queue.filter(r => r.status === 'PENDING').slice(0, 5).map((r) => (
                    <div key={r.id} className="flex items-center gap-3 bg-zinc-900/50 rounded-xl px-3 py-2">
                      {r.albumArt && <img src={r.albumArt} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0" />}
                      <div className="min-w-0 flex-1">
                        <p className="text-white text-sm truncate">{r.songTitle}</p>
                        <p className="text-zinc-500 text-xs truncate">{r.artistName}</p>
                      </div>
                      {r.tipCents > 0 && (
                        <span className="text-violet-400 text-xs font-bold">${(r.tipCents / 100).toFixed(0)}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step: Tip + details */}
        {step === 'tip' && selected && (
          <div className="space-y-5">
            <button onClick={() => setStep('search')} className="text-zinc-400 hover:text-white text-sm flex items-center gap-1 transition">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>

            {/* Selected song */}
            <div className="flex items-center gap-4 bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
              <img src={selected.artworkUrl100} alt="" className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-white font-bold truncate">{selected.trackName}</p>
                <p className="text-zinc-400 text-sm truncate">{selected.artistName}</p>
              </div>
            </div>

            {/* Tip picker */}
            {djEvent.djProfile.tipEnabled && djEvent.djProfile.stripeOnboarded && (
              <div>
                <h3 className="text-sm font-semibold text-zinc-300 mb-3">
                  Add a tip {djEvent.djProfile.requireTip ? '(required)' : '(optional)'}
                </h3>
                <div className="grid grid-cols-5 gap-2">
                  {TIP_PRESETS.filter(t => djEvent.djProfile.requireTip ? t > 0 : true).map(t => (
                    <button
                      key={t}
                      onClick={() => { setTipCents(t); setCustomTip(''); }}
                      className={`py-2.5 rounded-xl text-sm font-bold transition-colors ${
                        activeTip === t && !customTip
                          ? 'bg-violet-600 text-white'
                          : 'bg-zinc-900 border border-zinc-800 text-zinc-300 hover:border-violet-500'
                      }`}
                    >
                      {formatCents(t)}
                    </button>
                  ))}
                </div>
                <div className="mt-3 relative">
                  <span className="absolute left-3 top-3 text-zinc-400">$</span>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    placeholder="Custom amount"
                    value={customTip}
                    onChange={e => { setCustomTip(e.target.value); setTipCents(0); }}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-7 pr-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>
            )}

            {/* Optional fields */}
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Your name (optional)"
                value={requesterName}
                onChange={e => setRequesterName(e.target.value)}
                maxLength={100}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500"
              />
              <textarea
                placeholder="Message for the DJ (optional)"
                value={message}
                onChange={e => setMessage(e.target.value)}
                maxLength={300}
                rows={2}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500 resize-none"
              />
            </div>

            <button
              onClick={handleSubmitRequest}
              disabled={submitting || (djEvent.djProfile.requireTip && activeTip < djEvent.djProfile.minTipCents)}
              className="w-full py-3.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-bold rounded-xl transition-colors text-base"
            >
              {submitting
                ? 'Sending...'
                : activeTip > 0
                  ? `Request + Tip — Pay ${formatCents(activeTip + SERVICE_FEE_CENTS)}`
                  : 'Send Request'}
            </button>
            {activeTip > 0 && (
              <p className="text-zinc-500 text-xs text-center">
                {formatCents(activeTip)} tip + $0.50 service fee = {formatCents(activeTip + SERVICE_FEE_CENTS)} total
              </p>
            )}
          </div>
        )}

        {/* Step: Stripe payment */}
        {step === 'pay' && clientSecret && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white">Complete payment</h2>
            <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'night' } }}>
              <CheckoutForm
                clientSecret={clientSecret}
                requestId={requestId}
                onSuccess={handleSuccess}
              />
            </Elements>
          </div>
        )}

        {/* Step: Done */}
        {step === 'done' && (
          <div className="text-center py-12 space-y-4">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-black text-white">Request sent!</h2>
            <p className="text-zinc-400">Your song is in the queue. Enjoy the music.</p>
            <button
              onClick={() => { setStep('search'); setSelected(null); setTipCents(0); setCustomTip(''); setMessage(''); setRequesterName(''); }}
              className="mt-4 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-xl transition-colors"
            >
              Request another song
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
