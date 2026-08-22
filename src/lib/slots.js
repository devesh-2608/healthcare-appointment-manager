import { prisma } from "./db";

const HOLD_TTL_MINUTES = 5;

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Generates candidate slot start times for a doctor on a given date,
 * based on their recurring working hours, minus any leave day, minus
 * slots already taken (CONFIRMED or an unexpired PENDING hold).
 */
export async function getAvailableSlots(doctorId, dateISO) {
  const doctor = await prisma.doctor.findUnique({
    where: { id: doctorId },
    include: { workingHours: true, leaveDays: true },
  });
  if (!doctor) return [];

  const date = new Date(dateISO);
  const dayOfWeek = date.getUTCDay();

  const onLeave = doctor.leaveDays.some(
    (l) => l.date.toISOString().slice(0, 10) === dateISO
  );
  if (onLeave) return [];

  const hours = doctor.workingHours.filter((h) => h.dayOfWeek === dayOfWeek);
  if (hours.length === 0) return [];

  const dayStart = new Date(`${dateISO}T00:00:00.000Z`);
  const dayEnd = new Date(`${dateISO}T23:59:59.999Z`);

  const taken = await prisma.appointment.findMany({
    where: {
      doctorId,
      startTime: { gte: dayStart, lte: dayEnd },
      OR: [
        { status: "CONFIRMED" },
        { status: "PENDING", holdExpiresAt: { gt: new Date() } },
      ],
    },
    select: { startTime: true },
  });
  const takenSet = new Set(taken.map((t) => t.startTime.toISOString()));

  const slots = [];
  for (const wh of hours) {
    let cursor = toMinutes(wh.startTime);
    const end = toMinutes(wh.endTime);
    while (cursor + doctor.slotDurationMinutes <= end) {
      const slotStart = new Date(dayStart);
      slotStart.setUTCMinutes(cursor);
      if (!takenSet.has(slotStart.toISOString()) && slotStart > new Date()) {
        slots.push(slotStart.toISOString());
      }
      cursor += doctor.slotDurationMinutes;
    }
  }
  return slots;
}

/**
 * Attempts to hold+book a slot atomically. This is the core defence against
 * double-booking under concurrent requests — see system-design.md for the
 * full explanation. Two layers:
 *   1. A DB unique constraint on (doctorId, startTime) — the ultimate
 *      source of truth; Postgres rejects a second row for the same slot
 *      even under a race, regardless of what the app layer checked.
 *   2. A short-lived PENDING hold so a slot a patient is actively booking
 *      isn't shown as available to someone else mid-checkout.
 *
 * Returns { ok: true, appointment } or { ok: false, reason }.
 */
export async function bookSlot({ doctorId, patientId, startTime, symptomText }) {
  const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } });
  if (!doctor) return { ok: false, reason: "Doctor not found" };

  const start = new Date(startTime);
  const end = new Date(start.getTime() + doctor.slotDurationMinutes * 60000);

  const dateISO = start.toISOString().slice(0, 10);
  const onLeave = await prisma.leaveDay.findFirst({
    where: { doctorId, date: new Date(`${dateISO}T00:00:00.000Z`) },
  });
  if (onLeave) return { ok: false, reason: "Doctor is on leave for this date" };

  try {
    const appointment = await prisma.appointment.create({
      data: {
        doctorId,
        patientId,
        startTime: start,
        endTime: end,
        status: "PENDING",
        holdExpiresAt: new Date(Date.now() + HOLD_TTL_MINUTES * 60000),
        symptomText: symptomText || null,
      },
    });
    return { ok: true, appointment };
  } catch (err) {
    // Prisma P2002 = unique constraint violation on (doctorId, startTime)
    if (err.code === "P2002") {
      return { ok: false, reason: "This slot was just taken. Please pick another." };
    }
    throw err;
  }
}

/** Confirms a PENDING hold into a CONFIRMED booking (after symptom form submitted). */
export async function confirmBooking(appointmentId) {
  return prisma.appointment.update({
    where: { id: appointmentId },
    data: { status: "CONFIRMED", holdExpiresAt: null },
  });
}

/** Releases expired PENDING holds so their slots become bookable again. Call from a cron tick. */
export async function releaseExpiredHolds() {
  const result = await prisma.appointment.deleteMany({
    where: { status: "PENDING", holdExpiresAt: { lt: new Date() } },
  });
  return result.count;
}
