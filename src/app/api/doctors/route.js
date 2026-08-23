import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { hashPassword } from "@/lib/auth";
import { specialisationsForQuery } from "@/lib/symptomMap";

// GET /api/doctors?specialisation=<text> — public search, used by patients.
// The query text is matched two ways so patients can search either the
// specialisation name directly ("Cardiology") or a symptom/disease term
// ("chest pain") and still find the right doctors:
//   1. Direct substring match against the doctor's specialisation field.
//   2. Lookup against a symptom-keyword map (src/lib/symptomMap.js) that
//      resolves things like "skin rash" -> "Dermatology".
// Results from both are combined and de-duplicated.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("specialisation");

  if (!query) {
    const doctors = await prisma.doctor.findMany({
      include: { user: { select: { name: true, email: true } }, workingHours: true },
    });
    return NextResponse.json({ doctors });
  }

  const mappedSpecialisations = Array.from(specialisationsForQuery(query) || []);

  const doctors = await prisma.doctor.findMany({
    where: {
      OR: [
        { specialisation: { contains: query, mode: "insensitive" } },
        ...mappedSpecialisations.map((s) => ({
          specialisation: { equals: s, mode: "insensitive" },
        })),
      ],
    },
    include: {
      user: { select: { name: true, email: true } },
      workingHours: true,
    },
  });

  // Real-world fallback: an unrecognised symptom shouldn't dead-end into
  // "no doctors found" — a General Medicine doctor can triage almost
  // anything. Only kicks in when the search matched nothing at all.
  if (doctors.length === 0) {
    const fallbackDoctors = await prisma.doctor.findMany({
      where: { specialisation: { equals: "General Medicine", mode: "insensitive" } },
      include: { user: { select: { name: true, email: true } }, workingHours: true },
    });
    if (fallbackDoctors.length > 0) {
      return NextResponse.json({ doctors: fallbackDoctors, fallbackToGeneral: true });
    }
  }

  return NextResponse.json({ doctors });
}

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  specialisation: z.string().min(1),
  slotDurationMinutes: z.number().int().positive().default(30),
  workingHours: z
    .array(
      z.object({
        dayOfWeek: z.number().int().min(0).max(6),
        startTime: z.string(),
        endTime: z.string(),
      })
    )
    .min(1),
});

// POST /api/doctors — admin only. Creates the User (role=DOCTOR) + Doctor profile.
export async function POST(request) {
  const auth = requireAuth(request, ["ADMIN"]);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { name, email, password, specialisation, slotDurationMinutes, workingHours } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  }

  const doctor = await prisma.doctor.create({
    data: {
      specialisation,
      slotDurationMinutes,
      user: {
        create: { name, email, passwordHash: await hashPassword(password), role: "DOCTOR" },
      },
      workingHours: { create: workingHours },
    },
    include: { user: true, workingHours: true },
  });

  return NextResponse.json({ doctor }, { status: 201 });
}
