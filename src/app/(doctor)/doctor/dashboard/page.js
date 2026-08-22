"use client";
import { useEffect, useState } from "react";
import { apiFetch, getUser, logout } from "@/lib/apiClient";
import { useRouter } from "next/navigation";
import PulseLine from "@/components/PulseLine";

const URGENCY_CLASS = { Low: "urgency-low", Medium: "urgency-medium", High: "urgency-high" };
const STATUS_BADGE = {
  CONFIRMED: "badge-primary",
  COMPLETED: "badge-success",
  CANCELLED: "badge-neutral",
  DOCTOR_LEAVE: "badge-warning",
  PENDING: "badge-neutral",
};

export default function DoctorDashboard() {
  const router = useRouter();
  const [appointments, setAppointments] = useState([]);
  const [user, setUser] = useState(null);
  const [openNotesFor, setOpenNotesFor] = useState(null);
  const [notes, setNotes] = useState("");
  const [meds, setMeds] = useState([{ medication: "", dosage: "", frequencyPerDay: 1, durationDays: 5 }]);
  const [error, setError] = useState("");
  const [calendarConnected, setCalendarConnected] = useState(false);

  useEffect(() => {
    const u = getUser();
    if (!u) return router.push("/login");
    setUser(u);
    apiFetch("/api/appointments").then((d) => setAppointments(d.appointments));
    apiFetch("/api/auth/me")
      .then((d) => setCalendarConnected(d.user.calendarConnected))
      .catch(() => {});
  }, [router]);

  async function connectCalendar() {
    const data = await apiFetch("/api/calendar/oauth/start");
    window.location.href = data.url;
  }

  function updateMed(i, field, value) {
    setMeds((prev) => prev.map((m, idx) => (idx === i ? { ...m, [field]: value } : m)));
  }

  async function submitNotes(appointmentId) {
    setError("");
    try {
      await apiFetch("/api/notes", {
        method: "POST",
        body: JSON.stringify({
          appointmentId,
          doctorNotes: notes,
          prescription: meds.filter((m) => m.medication),
        }),
      });
      setOpenNotesFor(null);
      setNotes("");
      const d = await apiFetch("/api/appointments");
      setAppointments(d.appointments);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="page shell">
      <div className="hero-banner">
        <div>
          <div className="hero-banner-eyebrow">Doctor Portal</div>
          <h1>Dr. {user?.name}</h1>
          <PulseLine />
        </div>
        <div className="hero-banner-actions">
          {calendarConnected ? (
            <span className="badge badge-success" style={{ padding: "8px 14px", fontSize: 13 }}>
              ✓ Calendar connected
            </span>
          ) : (
            <button className="btn-secondary" onClick={connectCalendar}>
              Connect calendar
            </button>
          )}
          <button className="btn-ghost" onClick={() => { logout(); router.push("/login"); }}>
            Log out
          </button>
        </div>
      </div>

      {appointments.length === 0 && (
        <div className="empty-state card">
          <h3>No appointments yet</h3>
          <p>Bookings from patients will appear here.</p>
        </div>
      )}

      {appointments.map((a) => (
        <div key={a.id} className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
            <div>
              <h3>{a.patient.name}</h3>
              <p className="muted" style={{ margin: "4px 0 0" }}>
                {new Date(a.startTime).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
              </p>
            </div>
            <span className={`badge ${STATUS_BADGE[a.status] || "badge-neutral"}`}>{a.status.replace("_", " ")}</span>
          </div>

          {a.aiPreVisitSummary && (
            <div className={`card-flat ${URGENCY_CLASS[a.aiPreVisitSummary.urgencyLevel] || ""}`} style={{ marginTop: 14 }}>
              <p style={{ margin: "0 0 6px", fontWeight: 700, color: "var(--text)" }}>
                Urgency: {a.aiPreVisitSummary.urgencyLevel}
              </p>
              <p style={{ margin: "0 0 8px", color: "var(--text)" }}>
                <strong>Chief complaint:</strong> {a.aiPreVisitSummary.chiefComplaint}
              </p>
              {a.aiPreVisitSummary.suggestedQuestions?.length > 0 && (
                <>
                  <p style={{ margin: "0 0 4px", fontWeight: 600, color: "var(--text)" }}>Suggested questions</p>
                  <ul style={{ margin: 0, paddingLeft: 18, color: "var(--text-muted)" }}>
                    {a.aiPreVisitSummary.suggestedQuestions.map((q, i) => (
                      <li key={i}>{q}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}

          {a.status === "CONFIRMED" && openNotesFor !== a.id && (
            <button className="btn-secondary btn-sm" onClick={() => setOpenNotesFor(a.id)} style={{ marginTop: 14 }}>
              Add post-visit notes
            </button>
          )}

          {openNotesFor === a.id && (
            <div style={{ marginTop: 16 }}>
              <hr className="divider" />
              <label>Clinical notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Findings, diagnosis, and treatment plan"
              />
              <label style={{ marginTop: 14 }}>Prescription</label>
              {meds.map((m, i) => (
                <div key={i} className="field-row" style={{ marginBottom: 8 }}>
                  <input placeholder="Medication" value={m.medication} onChange={(e) => updateMed(i, "medication", e.target.value)} />
                  <input placeholder="Dosage" value={m.dosage} onChange={(e) => updateMed(i, "dosage", e.target.value)} />
                  <input
                    type="number"
                    min={1}
                    placeholder="Times/day"
                    value={m.frequencyPerDay}
                    onChange={(e) => updateMed(i, "frequencyPerDay", Number(e.target.value))}
                    style={{ maxWidth: 100 }}
                  />
                  <input
                    type="number"
                    min={1}
                    placeholder="Days"
                    value={m.durationDays}
                    onChange={(e) => updateMed(i, "durationDays", Number(e.target.value))}
                    style={{ maxWidth: 80 }}
                  />
                </div>
              ))}
              <button
                className="btn-ghost btn-sm"
                onClick={() => setMeds([...meds, { medication: "", dosage: "", frequencyPerDay: 1, durationDays: 5 }])}
              >
                + Add medication
              </button>
              {error && <p className="error-text">{error}</p>}
              <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
                <button className="btn-primary" onClick={() => submitNotes(a.id)}>
                  Submit &amp; generate patient summary
                </button>
                <button className="btn-ghost" onClick={() => setOpenNotesFor(null)}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </main>
  );
}
