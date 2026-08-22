import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { exchangeCodeForTokens } from "@/lib/calendar";

// GET /api/calendar/oauth/callback?code=...&state=<userId>
// Google redirects here after consent. We exchange the code for tokens
// and persist them against the user (state carries the userId).
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const userId = searchParams.get("state");

  if (!code || !userId) {
    return NextResponse.json({ error: "Missing code or state" }, { status: 400 });
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    await prisma.user.update({
      where: { id: userId },
      data: {
        googleAccessToken: tokens.access_token,
        googleRefreshToken: tokens.refresh_token ?? undefined,
        googleTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      },
    });
    return NextResponse.redirect(new URL("/patient/dashboard?calendar=connected", request.url));
  } catch (err) {
    console.error("Calendar OAuth callback failed:", err.message);
    return NextResponse.redirect(new URL("/patient/dashboard?calendar=error", request.url));
  }
}
