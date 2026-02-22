# DJ Request (MVP)

DJ Request is a full-stack web app for live song requests at bars, clubs, and private events.

## Stack
- **Frontend:** Next.js (React) with mobile-first UI
- **Backend:** Next.js API routes (Node.js runtime)
- **Database:** SQLite (`better-sqlite3`)
- **Auth:** Email/password + signed HTTP-only JWT cookie sessions
- **Realtime updates:** DJ dashboard polling every 3 seconds
- **Payments:** Square Checkout flow (sandbox or production via env vars)

## Features
- DJ authentication (register/login/logout)
- Event creation and lifecycle (live/ended)
- Unique guest URL per event + QR code generation/download
- Guest request form (no login)
- Spam prevention via rate limiting per IP/event
- DJ dashboard actions: accept, decline, mark played
- Sort requests by tip amount or newest
- Tip-aware UI highlighting + status handling
- Square checkout initiation before request submission (when tip > 0)

## Database schema
Tables are auto-created on startup in `dj-request.db`:
- `users(id, email, password_hash, created_at)`
- `events(id, dj_id, name, description, slug, status, created_at, ended_at)`
- `requests(id, event_id, song_name, artist, guest_message, status, tip_amount, payment_status, created_at, played_at)`

## API endpoints
### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

### Events
- `GET /api/events` (DJ only)
- `POST /api/events` (DJ only)
- `GET /api/events/:idOrSlug` (public)
- `PATCH /api/events/:id` (DJ owner only)

### Requests
- `GET /api/requests?eventId=<id>&sort=time|tip` (DJ only)
- `POST /api/requests` (guest submit)
- `PATCH /api/requests/:id` (DJ owner only)

### Payments
- `POST /api/payments/create-checkout`

## Square integration flow (example)
1. Guest enters a tip amount in the request form.
2. Frontend calls `POST /api/payments/create-checkout`.
3. Backend uses Square `payment-links` API (sandbox/prod based on env).
4. Guest is redirected to Square checkout URL in a new tab.
5. Request is submitted with `paymentStatus=pending`.
6. (Recommended next step): implement Square webhook endpoint to confirm settlement and update `requests.payment_status='paid'`.

If Square credentials are absent, the app uses a mock payment response so local development still works.

## Local setup
1. Install deps
   ```bash
   npm install
   ```
2. Create `.env.local`
   ```bash
   JWT_SECRET=replace-with-a-long-random-string

   # Optional Square
   SQUARE_ENV=sandbox
   SQUARE_APP_ID=
   SQUARE_LOCATION_ID=
   SQUARE_ACCESS_TOKEN=
   ```
3. Run dev server
   ```bash
   npm run dev
   ```
4. Open http://localhost:3000

## Notes for bar-floor usability
- Large, high-contrast action buttons for DJs
- Mobile-friendly guest page
- Minimal steps for quick request submission
- Low-latency updates via frequent polling
