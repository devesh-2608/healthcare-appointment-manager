// Standalone background worker for hosts that don't have native cron
// (e.g. Render/Railway "worker" service type). On Vercel, prefer Vercel
// Cron hitting /api/cron/reminders and /api/cron/email-retry instead —
// see README "Deployment" section.
//
// Run with: npm run worker:reminders
require("dotenv").config();
const cron = require("node-cron");

const BASE_URL = process.env.APP_BASE_URL || "http://localhost:3000";
const CRON_SECRET = process.env.CRON_SECRET;

async function hit(path) {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: { Authorization: `Bearer ${CRON_SECRET}` },
    });
    const data = await res.json();
    console.log(`[worker] ${path} ->`, data);
  } catch (err) {
    console.error(`[worker] ${path} failed:`, err.message);
  }
}

// Every 15 minutes: appointment + medication reminders, expired hold cleanup.
cron.schedule("*/15 * * * *", () => hit("/api/cron/reminders"));

// Every 10 minutes: retry failed email notifications.
cron.schedule("*/10 * * * *", () => hit("/api/cron/email-retry"));

console.log("Reminder worker started.");
