import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { bookSlot, confirmBooking } from "@/lib/slots";
import { sendNotification } from "@/lib/email";
import { updateCalendarEvent } from "@/lib/calendar";

const schema = z.object({ newStartTime: z.string() });

// POST /api/appointments/:id/reschedule
// Implemented as: hold the new slot first (fails cleanly if taken), then
// only cancel the old one once the new hold succeeds — so a failed
// reschedule never leaves the patient with no appointment at all.
export async function POST(request, { params }) {
  const auth = requireAuth(request, ["PATIENT"]);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const oldAppt = await prisma.appointment.findUnique({
    where: { id: params.id },
    include: { patient: true, doctor: { include: { user: true } } },
  });
  if (!oldAppt || oldAppt.patientId !== auth.payload.sub) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const holdResult = await bookSlot({
    doctorId: oldAppt.doctorId,
    patientId: oldAppt.patientId,
    startTime: parsed.data.newStartTime,
    symptomText: oldAppt.symptomText,
  });
  if (!holdResult.ok) {
    return NextResponse.json({ error: holdResult.reason }, { status: 409 });
  }

  let newAppt = await prisma.appointment.update({
    where: { id: holdResult.appointment.id },
    data: {
      aiPreVisitSummary: oldAppt.aiPreVisitSummary,
      urgency: oldAppt.urgency,
    },
  });
  newAppt = await confirmBooking(newAppt.id);

  await prisma.appointment.update({ where: { id: oldAppt.id }, data: { status: "CANCELLED" } });

  await updateCalendarEvent(oldAppt.patient, oldAppt.googleEventIdPatient, {
    startTime: newAppt.startTime,
    endTime: newAppt.endTime,
    summary: `Appointment with Dr. ${oldAppt.doctor.user.name}`,
  });
  await updateCalendarEvent(oldAppt.doctor.user, oldAppt.googleEventIdDoctor, {
    startTime: newAppt.startTime,
    endTime: newAppt.endTime,
    summary: `Appointment with ${oldAppt.patient.name}`,
  });

  await sendNotification({
    appointmentId: newAppt.id,
    type: "RESCHEDULE",
    recipientEmail: oldAppt.patient.email,
    body: `Your appointment with Dr. ${oldAppt.doctor.user.name} has been moved to ${newAppt.startTime.toLocaleString()}.`,
  });
  await sendNotification({
    appointmentId: newAppt.id,
    type: "RESCHEDULE",
    recipientEmail: oldAppt.doctor.user.email,
    body: `Appointment with ${oldAppt.patient.name} moved to ${newAppt.startTime.toLocaleString()}.`,
  });

  return NextResponse.json({ appointment: newAppt });
}
