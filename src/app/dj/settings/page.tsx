'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { toast } from 'sonner';

interface DJProfile {
  displayName: string;
  bio: string | null;
  slug: string;
  tipEnabled: boolean;
  requireTip: boolean;
  minTipCents: number;
  stripeOnboarded: boolean;
  stripeAccountId: string | null;
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<DJProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [stripeLoading, setStripeLoading] = useState(false);
  const searchParams = useSearchParams();

  function loadProfile() {
    return fetch('/api/dj/profile').then(r => r.json()).then(setProfile);
  }

  useEffect(() => {
    loadProfile();
    if (searchParams.get('stripe') === 'success') {
      toast.success('Stripe connected! You can now receive tips.');
    }
    if (searchParams.get('stripe') === 'refresh') {
      toast.info('Stripe onboarding incomplete. Please try again.');
    }
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    const res = await fetch('/api/dj/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        displayName: profile.displayName,
        bio: profile.bio,
        tipEnabled: profile.tipEnabled,
        requireTip: profile.requireTip,
        minTipCents: profile.minTipCents,
      }),
    });
    if (res.ok) {
      toast.success('Settings saved');
    } else {
      toast.error('Save failed');
    }
    setSaving(false);
  }

  async function handleStripeConnect() {
    setStripeLoading(true);
    const res = await fetch('/api/stripe/connect', { method: 'POST' });
    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
    } else {
      toast.error(data.error ?? 'Could not start Stripe onboarding');
      setStripeLoading(false);
    }
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <header className="bg-zinc-900 border-b border-zinc-800 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <a href="/dj/dashboard" className="text-zinc-400 hover:text-white text-sm transition">← Dashboard</a>
          <span className="text-white font-bold">Settings</span>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="text-zinc-400 hover:text-red-400 text-sm transition"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        {/* Profile */}
        <form onSubmit={handleSave} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-white font-bold text-lg">Profile</h2>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">DJ display name</label>
            <input
              type="text"
              value={profile.displayName}
              onChange={e => setProfile(p => p ? { ...p, displayName: e.target.value } : p)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Bio (optional)</label>
            <textarea
              value={profile.bio ?? ''}
              onChange={e => setProfile(p => p ? { ...p, bio: e.target.value } : p)}
              rows={3}
              maxLength={500}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500 resize-none"
              placeholder="Tell guests a bit about yourself"
            />
          </div>
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3">
            <p className="text-zinc-500 text-sm">Your request URL</p>
            <p className="text-violet-400 text-sm mt-0.5">/r/{profile.slug}</p>
          </div>

          <h3 className="text-white font-semibold pt-2">Tips</h3>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={profile.tipEnabled}
              onChange={e => setProfile(p => p ? { ...p, tipEnabled: e.target.checked } : p)}
              className="w-4 h-4 accent-violet-500"
            />
            <span className="text-zinc-300 text-sm">Enable tips</span>
          </label>
          {profile.tipEnabled && (
            <>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={profile.requireTip}
                  onChange={e => setProfile(p => p ? { ...p, requireTip: e.target.checked } : p)}
                  className="w-4 h-4 accent-violet-500"
                />
                <span className="text-zinc-300 text-sm">Require a tip to submit requests</span>
              </label>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Minimum tip amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-zinc-400">$</span>
                  <input
                    type="number"
                    min="0.50"
                    step="0.50"
                    value={(profile.minTipCents / 100).toFixed(2)}
                    onChange={e => setProfile(p => p ? { ...p, minTipCents: Math.round(parseFloat(e.target.value) * 100) } : p)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-7 pr-4 py-3 text-white focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-bold rounded-xl transition-colors"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </form>

        {/* Stripe */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h2 className="text-white font-bold text-lg mb-2">Payouts</h2>
          <p className="text-zinc-400 text-sm mb-4">
            Connect Stripe to receive tips. We take a 10% platform fee per tip.
          </p>
          {profile.stripeOnboarded ? (
            <div className="flex items-center gap-2 text-green-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm font-medium">Stripe connected</span>
            </div>
          ) : (
            <button
              onClick={handleStripeConnect}
              disabled={stripeLoading}
              className="px-5 py-2.5 bg-[#635BFF] hover:bg-[#4b45cc] disabled:opacity-50 text-white font-bold rounded-xl transition-colors text-sm"
            >
              {stripeLoading ? 'Redirecting...' : 'Connect with Stripe'}
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
