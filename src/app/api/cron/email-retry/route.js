import { NextResponse } from "next/server";
import { retryFailedNotifications } from "@/lib/email";

// GET /api/cron/email-retry — call every 10 min via Vercel Cron / node-cron.
export async function GET(request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await retryFailedNotifications();
  return NextResponse.json(result);
}
