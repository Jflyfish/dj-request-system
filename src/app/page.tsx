import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      <main className="flex-1 flex flex-col items-center justify-center px-4 text-center py-20">
        <div className="w-20 h-20 bg-violet-600 rounded-3xl flex items-center justify-center mb-8">
          <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
        </div>

        <h1 className="text-5xl sm:text-6xl font-black text-white tracking-tight mb-4">DJRequest</h1>
        <p className="text-xl text-zinc-400 mb-10 max-w-md">
          Song requests and tipping for live DJs. Simple, fast, no app required.
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/register"
            className="px-8 py-4 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-2xl text-lg transition-colors"
          >
            Get started — free
          </Link>
          <Link
            href="/login"
            className="px-8 py-4 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-2xl text-lg transition-colors"
          >
            DJ Login
          </Link>
        </div>

        <div className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl w-full">
          {[
            { icon: '📱', title: 'No app needed', desc: 'Guests scan a QR code and request songs from any browser.' },
            { icon: '💸', title: 'Tips go to you', desc: 'Stripe Connect sends tips straight to your account. We take 10%.' },
            { icon: '🎵', title: 'iTunes search', desc: 'Guests search any song from the iTunes catalog to make requests.' },
          ].map(f => (
            <div key={f.title} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-left">
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="text-white font-bold mb-1">{f.title}</h3>
              <p className="text-zinc-400 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t border-zinc-900 py-6 text-center text-zinc-600 text-sm">
        DJRequest © {new Date().getFullYear()}
      </footer>
    </div>
  );
}
