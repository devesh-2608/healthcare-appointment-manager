import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { sendNotification } from "@/lib/email";
import { deleteCalendarEvent } from "@/lib/calendar";

export async function POST(request, { params }) {
  const auth = requireAuth(request, ["PATIENT", "DOCTOR", "ADMIN"]);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const appointment = await prisma.appointment.findUnique({
    where: { id: params.id },
    include: { patient: true, doctor: { include: { user: true } } },
  });
  if (!appointment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { role, sub } = auth.payload;
  const isOwner =
    (role === "PATIENT" && appointment.patientId === sub) ||
    (role === "DOCTOR" && appointment.doctor.userId === sub) ||
    role === "ADMIN";
  if (!isOwner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.appointment.update({ where: { id: appointment.id }, data: { status: "CANCELLED" } });

  await deleteCalendarEvent(appointment.patient, appointment.googleEventIdPatient);
  await deleteCalendarEvent(appointment.doctor.user, appointment.googleEventIdDoctor);

  await sendNotification({
    appointmentId: appointment.id,
    type: "CANCELLATION",
    recipientEmail: appointment.patient.email,
    body: `Your appointment with Dr. ${appointment.doctor.user.name} on ${appointment.startTime.toLocaleString()} has been cancelled.`,
  });
  await sendNotification({
    appointmentId: appointment.id,
    type: "CANCELLATION",
    recipientEmail: appointment.doctor.user.email,
    body: `Appointment with ${appointment.patient.name} on ${appointment.startTime.toLocaleString()} has been cancelled.`,
  });

  return NextResponse.json({ cancelled: true });
}
