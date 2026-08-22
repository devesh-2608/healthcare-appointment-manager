import { NextResponse } from "next/server";
import { getAvailableSlots } from "@/lib/slots";

// GET /api/doctors/:id/slots?date=YYYY-MM-DD
export async function GET(request, { params }) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  if (!date) return NextResponse.json({ error: "date query param required" }, { status: 400 });

  const slots = await getAvailableSlots(params.id, date);
  return NextResponse.json({ slots });
}
