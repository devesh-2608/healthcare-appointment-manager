import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

// GET /api/auth/me — returns the logged-in user's basic info plus whether
// they've connected Google Calendar, so the frontend can show a persistent
// "Calendar connected" badge instead of relying on a one-time redirect flag.
export async function GET(request) {
  const auth = requireAuth(request);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const user = await prisma.user.findUnique({
    where: { id: auth.payload.sub },
    select: { id: true, name: true, email: true, role: true, googleRefreshToken: true },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      calendarConnected: Boolean(user.googleRefreshToken),
    },
  });
}
