import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import QueueManager from '@/components/QueueManager';
import QRCodeDisplay from '@/components/QRCodeDisplay';
import CopyButton from '@/components/CopyButton';

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect('/login');

  const djProfile = await prisma.dJProfile.findUnique({
    where: { userId: session.user.id },
    include: {
      events: {
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: {
          requests: {
            where: { status: { in: ['PENDING', 'PLAYING'] } },
            orderBy: [{ position: 'asc' }, { tipCents: 'desc' }],
          },
        },
      },
    },
  });

  if (!djProfile) redirect('/dj/onboard');

  const activeEvent = djProfile.events[0] ?? null;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const requestUrl = `${appUrl}/r/${djProfile.slug}`;

  return (
    <div className="min-h-screen bg-zinc-950">
      <header className="bg-zinc-900 border-b border-zinc-800 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <span className="text-white font-bold">DJ Dashboard</span>
          <div className="flex items-center gap-3">
            <Link href="/dj/tips" className="text-zinc-400 hover:text-white text-sm transition">Tips</Link>
            <Link href="/dj/settings" className="text-zinc-400 hover:text-white text-sm transition">Settings</Link>
            <Link
              href="/dj/events/new"
              className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold rounded-lg transition-colors"
            >
              + New Event
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* QR + link */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <QRCodeDisplay url={requestUrl} />
            <div>
              <h2 className="text-white font-bold text-lg mb-1">Your request link</h2>
              <p className="text-zinc-400 text-sm mb-3">Share this or display the QR code for guests to request songs.</p>
              <code className="text-violet-400 text-sm bg-zinc-950 px-3 py-1.5 rounded-lg block mb-3 break-all">
                {requestUrl}
              </code>
              <CopyButton text={requestUrl} />
            </div>
          </div>
        </div>

        {/* Active event queue */}
        {activeEvent ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-white font-bold text-xl">{activeEvent.name}</h2>
                {activeEvent.venue && <p className="text-zinc-400 text-sm">{activeEvent.venue}</p>}
              </div>
              <span className="flex items-center gap-1.5 text-xs text-green-400 bg-green-400/10 px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                Live
              </span>
            </div>
            <QueueManager eventId={activeEvent.id} initialRequests={activeEvent.requests} />
          </div>
        ) : (
          <div className="text-center py-16 bg-zinc-900 border border-zinc-800 rounded-2xl">
            <p className="text-zinc-400 mb-4">No active event. Create one to start accepting requests.</p>
            <Link
              href="/dj/events/new"
              className="px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl transition-colors inline-block"
            >
              Create Event
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
