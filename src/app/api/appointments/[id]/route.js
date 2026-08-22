import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET(request, { params }) {
  const auth = requireAuth(request);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const appointment = await prisma.appointment.findUnique({
    where: { id: params.id },
    include: {
      doctor: { include: { user: { select: { name: true, email: true } } } },
      patient: { select: { name: true, email: true } },
    },
  });
  if (!appointment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Ownership check: patients/doctors can only view their own appointment.
  const { role, sub } = auth.payload;
  if (role === "PATIENT" && appointment.patientId !== sub) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (role === "DOCTOR") {
    const doctor = await prisma.doctor.findUnique({ where: { userId: sub } });
    if (doctor?.id !== appointment.doctorId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  return NextResponse.json({ appointment });
}
