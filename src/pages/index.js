import { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';

const emptyEvent = { name: '', description: '' };

export default function Home() {
  const [authMode, setAuthMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [user, setUser] = useState(null);
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [requests, setRequests] = useState([]);
  const [eventForm, setEventForm] = useState(emptyEvent);
  const [sortBy, setSortBy] = useState('time');
  const [message, setMessage] = useState('');
  const [origin, setOrigin] = useState('');

  const selectedEvent = useMemo(
    () => events.find((event) => event.id === selectedEventId),
    [events, selectedEventId]
  );

  useEffect(() => {
    setOrigin(window.location.origin);
    fetch('/api/auth/me').then(async (res) => {
      const data = await res.json();
      if (data.user) {
        setUser(data.user);
      }
    });
  }, []);

  useEffect(() => {
    if (user) {
      loadEvents();
    }
  }, [user]);

  useEffect(() => {
    if (!selectedEventId || !user) return;

    loadRequests(selectedEventId, sortBy);
    const timer = setInterval(() => loadRequests(selectedEventId, sortBy), 3000);
    return () => clearInterval(timer);
  }, [selectedEventId, user, sortBy]);

  async function loadEvents() {
    const res = await fetch('/api/events');
    const data = await res.json();
    setEvents(data.events || []);
    if (!selectedEventId && data.events?.length) {
      setSelectedEventId(data.events[0].id);
    }
  }

  async function loadRequests(eventId, sort = 'time') {
    const res = await fetch(`/api/requests?eventId=${eventId}&sort=${sort}`);
    const data = await res.json();
    if (res.ok) {
      setRequests(data.requests);
    }
  }

  async function submitAuth(e) {
    e.preventDefault();
    setMessage('');

    const endpoint = authMode === 'register' ? '/api/auth/register' : '/api/auth/login';
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || 'Authentication failed');
      return;
    }

    setUser(data.user);
    setEmail('');
    setPassword('');
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    setEvents([]);
    setRequests([]);
  }

  async function createEvent(e) {
    e.preventDefault();
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventForm),
    });
    const data = await res.json();
    if (!res.ok) return setMessage(data.error || 'Could not create event');
    setEventForm(emptyEvent);
    setEvents([data.event, ...events]);
    setSelectedEventId(data.event.id);
  }

  async function updateEvent(status) {
    if (!selectedEvent) return;
    const res = await fetch(`/api/events/${selectedEvent.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (res.ok) {
      setEvents(events.map((event) => (event.id === data.event.id ? data.event : event)));
    }
  }

  async function updateRequest(id, status) {
    await fetch(`/api/requests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    loadRequests(selectedEventId, sortBy);
  }

  if (!user) {
    return (
      <main className="container">
        <h1>DJ Request</h1>
        <p className="subtitle">Fast request management for bars, clubs, and private events.</p>
        <form onSubmit={submitAuth} className="panel stack">
          <h2>{authMode === 'register' ? 'Create DJ account' : 'DJ login'}</h2>
          <input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input
            placeholder="Password (min 8 characters)"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit" className="btn-primary">{authMode === 'register' ? 'Create account' : 'Login'}</button>
          <button type="button" className="btn-ghost" onClick={() => setAuthMode(authMode === 'register' ? 'login' : 'register')}>
            {authMode === 'register' ? 'Already have an account?' : 'Need an account?'}
          </button>
          {message && <p className="error">{message}</p>}
        </form>
      </main>
    );
  }

  return (
    <main className="container">
      <div className="row spread">
        <h1>DJ Dashboard</h1>
        <button className="btn-ghost" onClick={logout}>Logout</button>
      </div>

      <section className="panel stack">
        <h2>Create event</h2>
        <form className="stack" onSubmit={createEvent}>
          <input
            placeholder="Event name"
            value={eventForm.name}
            onChange={(e) => setEventForm({ ...eventForm, name: e.target.value })}
            required
          />
          <textarea
            placeholder="Description (optional)"
            value={eventForm.description}
            onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
          />
          <button className="btn-primary" type="submit">Create live event</button>
        </form>
      </section>

      <section className="panel stack">
        <h2>Your events</h2>
        <div className="grid">
          {events.map((event) => (
            <button
              key={event.id}
              onClick={() => setSelectedEventId(event.id)}
              className={`event-card ${selectedEventId === event.id ? 'selected' : ''}`}
            >
              <div className="row spread"><strong>{event.name}</strong><span>{event.status}</span></div>
              <small>{origin ? `${origin}/event/${event.slug}` : `/event/${event.slug}`}</small>
            </button>
          ))}
        </div>
      </section>

      {selectedEvent && (
        <section className="panel stack">
          <div className="row spread">
            <h2>{selectedEvent.name}</h2>
            <div className="row">
              <button className="btn-warn" onClick={() => updateEvent('ended')}>End Event</button>
              <button className="btn-ghost" onClick={() => updateEvent('live')}>Go Live</button>
            </div>
          </div>

          <EventQr slug={selectedEvent.slug} origin={origin} />

          <div className="row spread">
            <h3>Incoming requests</h3>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="time">Sort by time</option>
              <option value="tip">Sort by tip</option>
            </select>
          </div>

          <div className="stack">
            {requests.map((request) => (
              <article key={request.id} className={`request ${request.tip_amount > 0 ? 'tipped' : ''}`}>
                <div className="row spread">
                  <strong>{request.song_name} — {request.artist}</strong>
                  <span>{request.tip_amount > 0 ? `$${request.tip_amount}` : 'No tip'}</span>
                </div>
                {request.guest_message && <p>{request.guest_message}</p>}
                <div className="row">
                  <button className="btn-primary" onClick={() => updateRequest(request.id, 'accepted')}>Accept</button>
                  <button className="btn-warn" onClick={() => updateRequest(request.id, 'declined')}>Decline</button>
                  <button className="btn-ghost" onClick={() => updateRequest(request.id, 'played')}>Played</button>
                  <span className="status">{request.status}</span>
                </div>
              </article>
            ))}
            {!requests.length && <p>No requests yet.</p>}
          </div>
        </section>
      )}
    </main>
  );
}

function EventQr({ slug, origin }) {
  const [src, setSrc] = useState('');

  useEffect(() => {
    if (!origin) return;
    const link = `${origin}/event/${slug}`;
    QRCode.toDataURL(link, { width: 200 }).then(setSrc);
  }, [slug, origin]);

  const href = origin ? `${origin}/event/${slug}` : ''; 

  return (
    <div className="row">
      {src && <img src={src} alt="Event QR code" width="140" height="140" />}
      <div className="stack">
        <a href={href} target="_blank" rel="noreferrer">{href}</a>
        <a href={src} download={`dj-request-${slug}.png`} className="btn-ghost">Download QR</a>
      </div>
    </div>
  );
}
