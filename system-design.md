# System Design Write-Up

## 1. Double-booking prevention

Slot conflicts are the highest-risk failure mode in a booking system, so
they're handled at two layers rather than one:

**Application layer (fast path):** `getAvailableSlots()` computes candidate
slots from a doctor's recurring `WorkingHour` rows, minus any `LeaveDay`,
minus times already `CONFIRMED` or held `PENDING`. This is what the patient
sees when choosing a time — it's optimistic and fast, but on its own it's
not race-safe: two patients could load the same "available" slot list and
both submit a booking for the same time within milliseconds of each other.

**Database layer (source of truth):** the `Appointment` table has a
composite unique constraint `@@unique([doctorId, startTime])`. When two
concurrent requests both try to `INSERT` an appointment for the same
doctor+time, Postgres guarantees only one succeeds; the second raises a
unique-constraint violation (Prisma error code `P2002`), which `bookSlot()`
catches and turns into a clean `409 "This slot was just taken"` response.
This means correctness never depends on application-level locking, timing,
or a "check-then-write" gap — the database enforces it unconditionally,
so it holds even under real concurrency, retries, or multiple app
instances.

## 2. Slot hold mechanism

Booking isn't instant from the patient's point of view — they pick a slot,
then fill in a symptom form before the booking is finalized. To stop a
slot from being shown as available to someone else during that window, a
booking is created as `PENDING` with a `holdExpiresAt` timestamp five
minutes in the future. `getAvailableSlots()` treats any `PENDING` hold
that hasn't expired as taken, alongside `CONFIRMED` appointments.

If the patient completes the flow, `confirmBooking()` flips the status to
`CONFIRMED` and clears the hold. If they abandon it, the hold simply
expires; a cron tick (`releaseExpiredHolds()`, called every 15 minutes
from `/api/cron/reminders`) deletes expired `PENDING` rows so the slot
becomes bookable again. Because the unique constraint applies regardless
of status, even a not-yet-expired hold physically blocks a second insert
for that slot — the hold is a UX nicety on top of a guarantee the DB
already provides.

## 3. Doctor leave conflict handling

When an admin marks a doctor on leave for a date (`POST
/api/doctors/:id/leave`), the flow is:

1. Insert the `LeaveDay` row (this alone stops any *new* bookings for
   that date, since `getAvailableSlots()` returns `[]` once a leave day
   exists).
2. Query all `CONFIRMED`/`PENDING` appointments for that doctor on that
   date — these are the pre-existing conflicts.
3. For each affected appointment: set status to `DOCTOR_LEAVE` (a
   distinct status from `CANCELLED` so patients and admins can tell *why*
   it ended), best-effort delete both Google Calendar events, and send an
   email notification to the patient explaining the cancellation and
   inviting them to rebook.

This is done as a loop over affected appointments rather than a bulk
update so each one gets its own notification and calendar cleanup
attempt — a failure notifying one patient (e.g. a bad email address)
doesn't stop the others from being processed. The leave-day insert and
status updates matter more than the notifications succeeding, so the
notification step is intentionally last and non-blocking.

## 4. Notification failure handling

Every notification (booking confirmation, reminder, cancellation,
reschedule, leave notice, medication reminder) is first persisted as a
`Notification` row with status `PENDING`, *then* an immediate send is
attempted. This ordering matters: even if the process crashes mid-send,
there's already a durable record that a notification was owed.

- On success, the row is marked `SENT` with a timestamp.
- On failure (SMTP timeout, bad credentials, provider outage), the row is
  marked `FAILED` with the error message and an incremented `attempts`
  counter — the user-facing action (booking, cancellation, etc.) still
  completes normally; email delivery is never allowed to block or roll
  back the underlying appointment change.
- A separate cron job (`/api/cron/email-retry`, every 10 minutes) queries
  `FAILED` notifications with `attempts < 5` and retries them, so a
  transient outage self-heals without user intervention. Notifications
  that keep failing past 5 attempts stop being retried automatically but
  remain visible in the `Notification` table for manual investigation —
  they're never silently dropped.

The same "never block the primary action" principle applies to the LLM
calls (`llm.js`) and Google Calendar calls (`calendar.js`): both are
wrapped in try/catch with safe fallbacks (a default "Medium" urgency
summary, a `null` calendar event ID) so an outage in either dependency
degrades the experience without breaking booking, note-taking, or
cancellation.
