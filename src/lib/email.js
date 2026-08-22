import nodemailer from "nodemailer";
import { prisma } from "./db";

let transporter;
function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

const SUBJECTS = {
  BOOKING_CONFIRMATION: "Appointment Confirmed",
  REMINDER: "Upcoming Appointment Reminder",
  CANCELLATION: "Appointment Cancelled",
  RESCHEDULE: "Appointment Rescheduled",
  LEAVE_NOTICE: "Your Doctor is Unavailable — Appointment Affected",
  MEDICATION_REMINDER: "Medication Reminder",
};

/**
 * Records a Notification row and attempts to send it immediately.
 * On failure it's left as FAILED with an incremented attempt count so the
 * background retry job (cron) can pick it up — notifications are never
 * silently dropped.
 */
export async function sendNotification({ appointmentId, type, recipientEmail, body }) {
  const notification = await prisma.notification.create({
    data: { appointmentId, type, recipientEmail, status: "PENDING" },
  });

  return attemptSend(notification.id, recipientEmail, type, body);
}

export async function attemptSend(notificationId, recipientEmail, type, body) {
  try {
    await getTransporter().sendMail({
      from: process.env.SMTP_FROM || "clinic@example.com",
      to: recipientEmail,
      subject: SUBJECTS[type] || "Clinic Notification",
      text: body,
    });
    await prisma.notification.update({
      where: { id: notificationId },
      data: { status: "SENT", sentAt: new Date(), attempts: { increment: 1 } },
    });
    return true;
  } catch (err) {
    console.error(`Email send failed for notification ${notificationId}:`, err.message);
    await prisma.notification.update({
      where: { id: notificationId },
      data: { status: "FAILED", lastError: String(err.message), attempts: { increment: 1 } },
    });
    return false;
  }
}

/**
 * Retries all FAILED notifications with attempts < maxAttempts.
 * Intended to be called from the /api/cron/email-retry route on a schedule.
 */
export async function retryFailedNotifications(maxAttempts = 5) {
  const failed = await prisma.notification.findMany({
    where: { status: "FAILED", attempts: { lt: maxAttempts } },
    take: 50,
  });

  let succeeded = 0;
  for (const n of failed) {
    // Body isn't stored on the row to keep it lean; in a real system you'd
    // persist the rendered body too. Here we re-render a generic retry note.
    const ok = await attemptSend(
      n.id,
      n.recipientEmail,
      n.type,
      "This is a retry of a previous notification regarding your appointment. Please check your patient portal for full details."
    );
    if (ok) succeeded++;
  }
  return { retried: failed.length, succeeded };
}
