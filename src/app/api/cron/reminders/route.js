import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendNotification } from "@/lib/email";
import { releaseExpiredHolds } from "@/lib/slots";

// GET /api/cron/reminders — call every 15 min via Vercel Cron / node-cron.
// Protect with CRON_SECRET so it can't be triggered by randoms.
export async function GET(request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const releasedHolds = await releaseExpiredHolds();

  // Appointment reminders: appointments starting in ~24h that haven't been reminded.
  // Since this cron only runs once/day (Vercel Hobby limit), widen the
// window to catch anything happening in roughly the next 1-2 days,
// rather than a narrow slice around exactly 24h from now.
const windowStart = new Date();
const windowEnd = new Date(Date.now() + 48 * 60 * 60 * 1000);
  const upcoming = await prisma.appointment.findMany({
    where: { status: "CONFIRMED", startTime: { gte: windowStart, lte: windowEnd } },
    include: { patient: true, doctor: { include: { user: true } } },
  });

  let appointmentReminders = 0;
  for (const appt of upcoming) {
    const alreadySent = await prisma.notification.findFirst({
      where: { appointmentId: appt.id, type: "REMINDER" },
    });
    if (alreadySent) continue;
    await sendNotification({
      appointmentId: appt.id,
      type: "REMINDER",
      recipientEmail: appt.patient.email,
      body: `Reminder: you have an appointment with Dr. ${appt.doctor.user.name} tomorrow at ${appt.startTime.toLocaleString()}.`,
    });
    appointmentReminders++;
  }

  // Medication reminders due now.
  const dueMeds = await prisma.medicationReminder.findMany({
    where: { sent: false, scheduledFor: { lte: new Date() } },
    include: { appointment: { include: { patient: true } } },
    take: 200,
  });

  let medicationReminders = 0;
  for (const reminder of dueMeds) {
    await sendNotification({
      appointmentId: reminder.appointmentId,
      type: "MEDICATION_REMINDER",
      recipientEmail: reminder.appointment.patient.email,
      body: `Reminder: time to take your medication — ${reminder.medication}.`,
    });
    await prisma.medicationReminder.update({ where: { id: reminder.id }, data: { sent: true } });
    medicationReminders++;
  }

  return NextResponse.json({ releasedHolds, appointmentReminders, medicationReminders });
}
