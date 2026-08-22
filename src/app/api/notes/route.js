import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { generatePostVisitSummary } from "@/lib/llm";
import { sendNotification } from "@/lib/email";

const medSchema = z.object({
  medication: z.string(),
  dosage: z.string(),
  frequencyPerDay: z.number().int().positive(),
  durationDays: z.number().int().positive(),
});

const schema = z.object({
  appointmentId: z.string(),
  doctorNotes: z.string().min(1),
  prescription: z.array(medSchema).default([]),
});

// POST /api/notes — doctor submits post-visit notes + prescription.
// Generates an LLM patient-friendly summary, marks appointment COMPLETED,
// schedules MedicationReminder rows based on frequency, and emails the patient.
export async function POST(request) {
  const auth = requireAuth(request, ["DOCTOR"]);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { appointmentId, doctorNotes, prescription } = parsed.data;

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { doctor: true, patient: true },
  });
  if (!appointment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const doctor = await prisma.doctor.findUnique({ where: { userId: auth.payload.sub } });
  if (!doctor || doctor.id !== appointment.doctorId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { summary } = await generatePostVisitSummary(doctorNotes, prescription);

  const updated = await prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      doctorNotes,
      prescription,
      aiPostVisitSummary: summary,
      status: "COMPLETED",
    },
  });

  // Schedule medication reminders: spread `frequencyPerDay` doses evenly
  // across waking hours (8am–8pm) for `durationDays`, starting tomorrow.
  const reminderRows = [];
  for (const med of prescription) {
    const intervalHours = 12 / med.frequencyPerDay;
    for (let day = 0; day < med.durationDays; day++) {
      for (let dose = 0; dose < med.frequencyPerDay; dose++) {
        const scheduledFor = new Date();
        scheduledFor.setDate(scheduledFor.getDate() + day + 1);
        scheduledFor.setHours(8 + Math.round(dose * intervalHours), 0, 0, 0);
        reminderRows.push({
          appointmentId,
          medication: `${med.medication} (${med.dosage})`,
          scheduledFor,
        });
      }
    }
  }
  if (reminderRows.length > 0) {
    await prisma.medicationReminder.createMany({ data: reminderRows });
  }

  await sendNotification({
    appointmentId,
    type: "BOOKING_CONFIRMATION",
    recipientEmail: appointment.patient.email,
    body: `Your visit summary is ready: ${summary}`,
  });

  return NextResponse.json({ appointment: updated, medicationRemindersScheduled: reminderRows.length });
}
