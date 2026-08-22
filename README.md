# Healthcare Appointment & Follow-up Manager

A full-stack clinic platform with separate patient, doctor, and admin
portals. Patients book appointments and submit symptoms in advance; an LLM
generates a pre-visit summary (urgency + chief complaint + suggested
questions) for the doctor; after the visit, the doctor's notes are turned
into a patient-friendly post-visit summary with a medication schedule.
Both sides get email confirmations and Google Calendar events, kept in
sync through cancellations and reschedules.

See [`system-design.md`](./system-design.md) for the write-up on
double-booking prevention, slot holds, doctor-leave conflict handling, and
notification failure handling.

## Tech stack

- **Framework:** Next.js 14 (App Router) — API routes + React frontend in one project
- **Database:** PostgreSQL via Prisma ORM
- **Auth:** JWT (role-based: `PATIENT` / `DOCTOR` / `ADMIN`)
- **LLM:** Groq API (`llama-3.3-70b-versatile`, free tier) for pre-visit and post-visit summaries
- **Email:** Nodemailer over SMTP (works with SendGrid, Mailgun, or any SMTP provider)
- **Calendar:** Google Calendar API via OAuth 2.0
- **Background jobs:** `/api/cron/*` routes, triggered by Vercel Cron (or the included standalone worker for non-Vercel hosts)

## Project structure

```
prisma/schema.prisma        Full DB schema (see "Database schema" below)
prisma/seed.js              Seeds an admin + sample doctor for quick testing
src/lib/
  db.js                     Prisma client singleton
  auth.js                   Password hashing, JWT issue/verify, role guard
  llm.js                    Groq API calls + graceful fallback on failure
  email.js                  Notification send + retry logic
  calendar.js               Google Calendar OAuth + event CRUD (best-effort)
  slots.js                  Slot generation, double-booking-safe booking, holds
src/app/api/                All backend routes (see "API reference" below)
src/app/(patient)/          Patient portal pages
src/app/(doctor)/           Doctor portal pages
src/app/(admin)/            Admin portal pages
scripts/reminderWorker.js   Standalone cron alternative for Render/Railway
system-design.md            Required system design write-up (≤800 words)
```

## Setup guide

### 1. Prerequisites
- Node.js 18+
- A PostgreSQL database (free options: [Neon](https://neon.tech), [Supabase](https://supabase.com), [Railway](https://railway.app))

### 2. Install
```bash
git clone <your-repo-url>
cd healthcare-appointment-manager
npm install
```

### 3. Configure environment
```bash
cp .env.example .env
```
Fill in `.env` — see inline comments in `.env.example` for where each value
comes from. At minimum you need `DATABASE_URL` and `JWT_SECRET` to run the
app; `GROQ_API_KEY`, SMTP vars, and Google OAuth vars are needed for
the LLM, email, and calendar features respectively (each degrades
gracefully if left unset — see `system-design.md` §4).

### 4. Set up the database
```bash
npx prisma migrate dev --name init
npm run prisma:seed
```
This creates all tables and seeds:
- Admin: `admin@clinic.com` / `Admin@12345`
- Doctor: `dr.smith@clinic.com` / `Doctor@12345` (General Medicine, Mon–Fri 9–5)

### 5. Run locally
```bash
npm run dev
```
Visit `http://localhost:3000` — you'll land on `/login`. Register a new
patient account via "Register", or log in as the seeded admin/doctor above.

### 6. Background jobs (reminders, retries, expired-hold cleanup)
Two options:
- **On Vercel:** `vercel.json` already defines the cron schedule — no extra
  setup needed once deployed, as long as `CRON_SECRET` is set as an env var
  (Vercel automatically sends it as a bearer token to cron routes).
- **Anywhere else:** run `npm run worker:reminders` as a long-lived process
  (e.g. a Render/Railway "worker" service). It pings `/api/cron/reminders`
  and `/api/cron/email-retry` on a schedule using `node-cron`.

## Google Calendar setup

1. Go to the [Google Cloud Console](https://console.cloud.google.com/apis/credentials) and create a project (or use an existing one).
2. Enable the **Google Calendar API** for that project.
3. Create an **OAuth 2.0 Client ID** (type: Web application).
4. Add an authorized redirect URI matching `GOOGLE_REDIRECT_URI` in your `.env`, e.g. `http://localhost:3000/api/calendar/oauth/callback` for local dev, or `https://your-app.vercel.app/api/calendar/oauth/callback` in production.
5. Copy the generated Client ID and Client Secret into `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
6. In the app, a logged-in patient or doctor clicks "Connect Google Calendar" (calls `GET /api/calendar/oauth/start`), which redirects to Google's consent screen. On approval, Google redirects back to `/api/calendar/oauth/callback`, which stores the access/refresh tokens against that user. Calendar events are then created automatically on every future booking.

## LLM prompts

Both prompts live in `src/lib/llm.js` and match the assignment's LLM Usage
Guidance:

**Pre-visit summary** (called from `POST /api/appointments` right after a
slot hold succeeds):
> Analyse these symptoms and return ONLY a JSON object with keys
> "urgencyLevel" (one of "Low","Medium","High"), "chiefComplaint" (short
> string), and "suggestedQuestions" (array of exactly 3 short strings the
> doctor could ask the patient). No markdown, no preamble, JSON only.
> Symptoms: `<symptoms>`

**Post-visit summary** (called from `POST /api/notes`):
> Convert these clinical notes into a patient-friendly summary with a
> medication schedule and follow-up steps. Use plain, reassuring language
> a non-medical person can understand. Keep it under 200 words.
> Clinical notes: `<notes>`
> Prescription (structured): `<prescription JSON>`

Both calls have a 15-second timeout and a safe fallback if the API errors,
times out, or returns unparseable output — see `system-design.md` §4 and
the inline comments in `llm.js`.

## Database schema

Full definition in [`prisma/schema.prisma`](./prisma/schema.prisma).
Summary:

| Model | Purpose |
|---|---|
| `User` | All accounts (patient/doctor/admin); also stores Google OAuth tokens |
| `Doctor` | Doctor profile — specialisation, slot duration; 1:1 with `User` |
| `WorkingHour` | Recurring weekly availability per doctor |
| `LeaveDay` | Specific dates a doctor is unavailable |
| `Appointment` | Central booking record — status, symptoms, AI summaries, notes, prescription, calendar event IDs. `@@unique([doctorId, startTime])` is the double-booking guarantee. |
| `Notification` | Every email sent or attempted, with status/attempts for retry |
| `MedicationReminder` | Individual scheduled dose reminders derived from a prescription |

## API reference

All routes except `/api/auth/*`, `GET /api/doctors`, and
`GET /api/doctors/:id/slots` require `Authorization: Bearer <token>`.

| Method & path | Role | Purpose |
|---|---|---|
| `POST /api/auth/register` | — | Register (defaults to PATIENT role) |
| `POST /api/auth/login` | — | Log in, returns JWT |
| `GET /api/doctors?specialisation=` | Public | Search doctors |
| `POST /api/doctors` | Admin | Create a doctor profile + account |
| `GET /api/doctors/:id/slots?date=` | Public | Available slots for a date |
| `POST /api/doctors/:id/leave` | Admin | Mark a doctor on leave; cancels + notifies affected patients |
| `GET /api/appointments` | Any | List own appointments (role-scoped) |
| `POST /api/appointments` | Patient | Book a slot end-to-end (hold → AI summary → confirm → email → calendar) |
| `GET /api/appointments/:id` | Owner | Appointment detail |
| `POST /api/appointments/:id/cancel` | Owner | Cancel + notify + remove calendar events |
| `POST /api/appointments/:id/reschedule` | Patient | Move to a new slot safely |
| `POST /api/notes` | Doctor | Submit post-visit notes/prescription → AI patient summary + medication reminders |
| `GET /api/calendar/oauth/start` | Any | Get Google consent URL |
| `GET /api/calendar/oauth/callback` | — | OAuth redirect target |
| `GET /api/cron/reminders` | Cron secret | Appointment + medication reminders, expired-hold cleanup |
| `GET /api/cron/email-retry` | Cron secret | Retries failed notifications |

## Known simplifications (assignment scope)

- Doctor/admin accounts are created via open registration/admin form
  rather than an invite-only flow — acceptable for demo purposes but
  should be gated in a real deployment.
- `Notification` retry re-sends a generic message rather than the
  original rendered body, to keep the schema lean (see comment in
  `email.js`).
- No payment integration — booking a slot is free/instant after the
  symptom form.

## Deployment

Any Node-friendly host works (Vercel, Render, Railway). On Vercel:
1. Push this repo to GitHub (public, `main` branch — see submission guidelines).
2. Import the repo in Vercel, add all `.env.example` variables as project env vars.
3. Set your Postgres provider's connection string as `DATABASE_URL`, then run `npx prisma migrate deploy` (Vercel build step, or manually).
4. Vercel Cron (`vercel.json`) handles the background jobs automatically.
