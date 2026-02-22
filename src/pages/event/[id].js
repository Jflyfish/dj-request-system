import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

export default function GuestEventPage() {
  const router = useRouter();
  const { id } = router.query;
  const [event, setEvent] = useState(null);
  const [form, setForm] = useState({ songName: '', artist: '', guestMessage: '', tipAmount: '' });
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!id) return;
    fetch(`/api/events/${id}`).then(async (res) => {
      const data = await res.json();
      if (res.ok) setEvent(data.event);
      else setMessage(data.error || 'Event unavailable');
    });
  }, [id]);

  async function createTipCheckout() {
    const res = await fetch('/api/payments/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipAmount: form.tipAmount, songName: form.songName }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Payment start failed');
    if (data.checkoutUrl) {
      window.open(data.checkoutUrl, '_blank', 'noopener,noreferrer');
    }
    return data.paymentStatus;
  }

  async function submitRequest(e) {
    e.preventDefault();
    setMessage('');

    let paymentStatus = 'none';
    try {
      if (Number(form.tipAmount) > 0) {
        paymentStatus = await createTipCheckout();
      }

      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventSlug: event.slug,
          ...form,
          paymentStatus,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submit failed');
      setMessage('Request sent! The DJ sees it in real time.');
      setForm({ songName: '', artist: '', guestMessage: '', tipAmount: '' });
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <main className="container mobile">
      <h1>{event?.name || 'DJ Request'}</h1>
      <p className="subtitle">{event?.status === 'ended' ? 'This event has ended.' : 'Submit your song request below.'}</p>

      {event?.status === 'live' && (
        <form className="panel stack" onSubmit={submitRequest}>
          <input
            placeholder="Song name"
            value={form.songName}
            onChange={(e) => setForm({ ...form, songName: e.target.value })}
            required
          />
          <input
            placeholder="Artist"
            value={form.artist}
            onChange={(e) => setForm({ ...form, artist: e.target.value })}
            required
          />
          <textarea
            placeholder="Message for DJ (optional)"
            value={form.guestMessage}
            onChange={(e) => setForm({ ...form, guestMessage: e.target.value })}
          />
          <input
            type="number"
            min="0"
            step="1"
            placeholder="Tip amount in USD (optional)"
            value={form.tipAmount}
            onChange={(e) => setForm({ ...form, tipAmount: e.target.value })}
          />
          <button type="submit" className="btn-primary big">Send Request</button>
        </form>
      )}

      {message && <p className="info">{message}</p>}
    </main>
  );
}
