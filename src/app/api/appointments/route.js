import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { bookSlot, confirmBooking } from "@/lib/slots";
import { generatePreVisitSummary } from "@/lib/llm";
import { sendNotification } from "@/lib/email";
import { createCalendarEvent } from "@/lib/calendar";

// GET /api/appointments — patient sees their own, doctor sees theirs, admin sees all
export async function GET(request) {
  const auth = requireAuth(request);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const { role, sub } = auth.payload;
  let where = {};
  if (role === "PATIENT") where = { patientId: sub };
  if (role === "DOCTOR") {
    const doctor = await prisma.doctor.findUnique({ where: { userId: sub } });
    where = { doctorId: doctor?.id };
  }
  // ADMIN: no filter, sees all

  const appointments = await prisma.appointment.findMany({
    where,
    include: {
      doctor: { include: { user: { select: { name: true } } } },
      patient: { select: { name: true, email: true } },
    },
    orderBy: { startTime: "desc" },
  });

  return NextResponse.json({ appointments });
}

const bookSchema = z.object({
  doctorId: z.string(),
  startTime: z.string(), // ISO datetime
  symptomText: z.string().min(1, "Please describe your symptoms"),
});

// POST /api/appointments — patient books a slot end-to-end:
// hold slot -> generate AI pre-visit summary -> confirm -> email both sides
// -> create calendar events (best-effort). Each stage degrades gracefully.
export async function POST(request) {
  const auth = requireAuth(request, ["PATIENT"]);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const body = await request.json();
  const parsed = bookSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { doctorId, startTime, symptomText } = parsed.data;
  const patientId = auth.payload.sub;

  const holdResult = await bookSlot({ doctorId, patientId, startTime, symptomText });
  if (!holdResult.ok) {
    return NextResponse.json({ error: holdResult.reason }, { status: 409 });
  }
  let appointment = holdResult.appointment;

  // AI pre-visit summary — failure here must not lose the booking (see llm.js fallback).
  const aiSummary = await generatePreVisitSummary(symptomText);
  appointment = await prisma.appointment.update({
    where: { id: appointment.id },
    data: { aiPreVisitSummary: aiSummary, urgency: aiSummary.urgencyLevel.toUpperCase() },
  });

  appointment = await confirmBooking(appointment.id);

  const [patient, doctor] = await Promise.all([
    prisma.user.findUnique({ where: { id: patientId } }),
    prisma.doctor.findUnique({ where: { id: doctorId }, include: { user: true } }),
  ]);

  const patientEventId = await createCalendarEvent(patient, {
    summary: `Appointment with Dr. ${doctor.user.name}`,
    description: `Specialisation: ${doctor.specialisation}`,
    startTime: appointment.startTime,
    endTime: appointment.endTime,
  });
  const doctorEventId = await createCalendarEvent(doctor.user, {
    summary: `Appointment with ${patient.name}`,
    description: `Chief complaint: ${aiSummary.chiefComplaint}`,
    startTime: appointment.startTime,
    endTime: appointment.endTime,
  });

  if (patientEventId || doctorEventId) {
    appointment = await prisma.appointment.update({
      where: { id: appointment.id },
      data: { googleEventIdPatient: patientEventId, googleEventIdDoctor: doctorEventId },
    });
  }

  await sendNotification({
    appointmentId: appointment.id,
    type: "BOOKING_CONFIRMATION",
    recipientEmail: patient.email,
    body: `Your appointment with Dr. ${doctor.user.name} is confirmed for ${appointment.startTime.toLocaleString()}.`,
  });
  await sendNotification({
    appointmentId: appointment.id,
    type: "BOOKING_CONFIRMATION",
    recipientEmail: doctor.user.email,
    body: `New appointment booked with ${patient.name} at ${appointment.startTime.toLocaleString()}. Urgency: ${aiSummary.urgencyLevel}.`,
  });

  return NextResponse.json({ appointment }, { status: 201 });
}
