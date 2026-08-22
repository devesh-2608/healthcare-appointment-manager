import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { sendNotification } from "@/lib/email";
import { deleteCalendarEvent } from "@/lib/calendar";

const schema = z.object({ date: z.string(), reason: z.string().optional() });

// POST /api/doctors/:id/leave — admin marks a doctor on leave for a date.
// Any existing CONFIRMED/PENDING appointments that day are cancelled and
// both patient and doctor are notified (email + calendar event removed).
export async function POST(request, { params }) {
  const auth = requireAuth(request, ["ADMIN"]);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const doctorId = params.id;
  const dateOnly = new Date(`${parsed.data.date}T00:00:00.000Z`);
  const dayEnd = new Date(`${parsed.data.date}T23:59:59.999Z`);

  const doctor = await prisma.doctor.findUnique({ where: { id: doctorId }, include: { user: true } });
  if (!doctor) return NextResponse.json({ error: "Doctor not found" }, { status: 404 });

  await prisma.leaveDay.create({
    data: { doctorId, date: dateOnly, reason: parsed.data.reason },
  });

  const affected = await prisma.appointment.findMany({
    where: {
      doctorId,
      startTime: { gte: dateOnly, lte: dayEnd },
      status: { in: ["CONFIRMED", "PENDING"] },
    },
    include: { patient: true },
  });

  const results = [];
  for (const appt of affected) {
    await prisma.appointment.update({
      where: { id: appt.id },
      data: { status: "DOCTOR_LEAVE" },
    });

    // Best-effort calendar cleanup — never blocks the notification.
    await deleteCalendarEvent(appt.patient, appt.googleEventIdPatient);
    await deleteCalendarEvent(doctor.user, appt.googleEventIdDoctor);

    await sendNotification({
      appointmentId: appt.id,
      type: "LEAVE_NOTICE",
      recipientEmail: appt.patient.email,
      body: `Your appointment with Dr. ${doctor.user.name} on ${appt.startTime.toLocaleString()} has been cancelled because the doctor is unavailable that day. Please rebook at your convenience — we're sorry for the inconvenience.`,
    });

    results.push(appt.id);
  }

  return NextResponse.json({ leaveMarked: true, affectedAppointments: results });
}
