import { google } from "googleapis";
import { prisma } from "./db";

function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

export function getGoogleAuthUrl(state) {
  const client = getOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/calendar.events"],
    state,
  });
}

export async function exchangeCodeForTokens(code) {
  const client = getOAuthClient();
  const { tokens } = await client.getToken(code);
  return tokens; // { access_token, refresh_token, expiry_date, ... }
}

async function getAuthedClientForUser(user) {
  if (!user.googleRefreshToken) return null;
  const client = getOAuthClient();
  client.setCredentials({
    access_token: user.googleAccessToken,
    refresh_token: user.googleRefreshToken,
  });

  // googleapis auto-refreshes; persist the new access token when it rotates.
  client.on("tokens", async (tokens) => {
    if (tokens.access_token) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          googleAccessToken: tokens.access_token,
          googleTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
        },
      });
    }
  });

  return client;
}

/**
 * Creates a calendar event for a given user (patient or doctor) if they've
 * connected Google Calendar. Returns the eventId, or null if the user
 * hasn't connected calendar or the API call fails — calendar sync is
 * best-effort and must never block booking.
 */
export async function createCalendarEvent(user, { summary, description, startTime, endTime }) {
  try {
    const client = await getAuthedClientForUser(user);
    if (!client) return null;

    const calendar = google.calendar({ version: "v3", auth: client });
    const event = await calendar.events.insert({
      calendarId: "primary",
      requestBody: {
        summary,
        description,
        start: { dateTime: startTime.toISOString() },
        end: { dateTime: endTime.toISOString() },
      },
    });
    return event.data.id;
  } catch (err) {
    console.error(`Calendar event creation failed for user ${user.id}:`, err.message);
    return null;
  }
}

export async function updateCalendarEvent(user, eventId, { startTime, endTime, summary }) {
  if (!eventId) return false;
  try {
    const client = await getAuthedClientForUser(user);
    if (!client) return false;
    const calendar = google.calendar({ version: "v3", auth: client });
    await calendar.events.patch({
      calendarId: "primary",
      eventId,
      requestBody: {
        summary,
        start: { dateTime: startTime.toISOString() },
        end: { dateTime: endTime.toISOString() },
      },
    });
    return true;
  } catch (err) {
    console.error(`Calendar event update failed (${eventId}):`, err.message);
    return false;
  }
}

export async function deleteCalendarEvent(user, eventId) {
  if (!eventId) return false;
  try {
    const client = await getAuthedClientForUser(user);
    if (!client) return false;
    const calendar = google.calendar({ version: "v3", auth: client });
    await calendar.events.delete({ calendarId: "primary", eventId });
    return true;
  } catch (err) {
    console.error(`Calendar event delete failed (${eventId}):`, err.message);
    return false;
  }
}
