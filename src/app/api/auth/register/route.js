import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword, signToken } from "@/lib/auth";

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["PATIENT", "DOCTOR", "ADMIN"]).default("PATIENT"),
  phone: z.string().optional(),
});

export async function POST(request) {
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { name, email, password, role, phone } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  }

  // Note: in production, ADMIN/DOCTOR account creation should be gated
  // (e.g. invite-only) rather than open self-registration. Left open here
  // for assignment/demo simplicity — see README "Known simplifications".
  const user = await prisma.user.create({
    data: { name, email, passwordHash: await hashPassword(password), role, phone },
  });

  const token = signToken(user);
  return NextResponse.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
}
