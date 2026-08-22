import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getGoogleAuthUrl } from "@/lib/calendar";

// GET /api/calendar/oauth/start — returns the Google consent URL for the
// logged-in user to connect their calendar. Frontend redirects to it.
export async function GET(request) {
  const auth = requireAuth(request);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const url = getGoogleAuthUrl(auth.payload.sub); // state = userId
  return NextResponse.json({ url });
}
