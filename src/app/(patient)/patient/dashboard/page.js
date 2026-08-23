"use client";
import { useEffect, useState } from "react";
import { apiFetch, getUser, logout } from "@/lib/apiClient";
import { useRouter } from "next/navigation";
import PulseLine from "@/components/PulseLine";

const STATUS_BADGE = {
  CONFIRMED: "badge-primary",
  COMPLETED: "badge-success",
  CANCELLED: "badge-neutral",
  DOCTOR_LEAVE: "badge-warning",
  PENDING: "badge-neutral",
};

export default function PatientDashboard() {
  const router = useRouter();
  const [appointments, setAppointments] = useState([]);
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [calendarConnected, setCalendarConnected] = useState(false);

  useEffect(() => {
    const u = getUser();
    if (!u) return router.push("/login");
    setUser(u);
    apiFetch("/api/appointments")
      .then((d) => setAppointments(d.appointments))
      .catch((e) => setError(e.message))
      .finally(() => setLoaded(true));
    apiFetch("/api/auth/me")
      .then((d) => setCalendarConnected(d.user.calendarConnected))
      .catch(() => {});
  }, [router]);

  async function connectCalendar() {
    const data = await apiFetch("/api/calendar/oauth/start");
    window.location.href = data.url;
  }

  async function cancel(id) {
    if (!confirm("Cancel this appointment?")) return;
    await apiFetch(`/api/appointments/${id}/cancel`, { method: "POST" });
    setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status: "CANCELLED" } : a)));
  }

  return (
    <main className="page shell">
      <div className="hero-banner">
        <div>
          <div className="hero-banner-eyebrow">Patient Portal</div>
          <h1>Welcome, {user?.name?.split(" ")[0]}</h1>
          <PulseLine />
        </div>
        <div className="hero-banner-actions">
          <button className="btn-secondary" onClick={() => router.push("/patient/book")} style={{ background: "#fff", color: "var(--primary-dark)" }}>
            Book appointment
          </button>
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

      {error && <p className="error-text">{error}</p>}

      <h2 style={{ marginBottom: 16 }}>Your appointments</h2>

      {loaded && appointments.length === 0 && (
        <div className="empty-state card">
          <h3>No appointments yet</h3>
          <p>Book your first appointment to get started.</p>
        </div>
      )}

      {appointments.map((a) => (
        <div key={a.id} className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
            <div>
              <h3>Dr. {a.doctor.user.name}</h3>
              <p className="muted" style={{ margin: "4px 0 0" }}>
                {new Date(a.startTime).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
              </p>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <span className={`badge ${STATUS_BADGE[a.status] || "badge-neutral"}`}>{a.status.replace("_", " ")}</span>
              {a.urgency && <span className="badge badge-neutral">Urgency: {a.urgency}</span>}
            </div>
          </div>
          {a.aiPostVisitSummary && (
            <div className="card-flat" style={{ marginTop: 14 }}>
              <p style={{ margin: "0 0 6px", fontWeight: 700, color: "var(--text)" }}>Visit summary</p>
              <p style={{ margin: 0, color: "var(--text)", whiteSpace: "pre-line" }}>
                {a.aiPostVisitSummary}
              </p>
            </div>
          )}
          {a.status === "CONFIRMED" && (
            <button className="btn-danger btn-sm" onClick={() => cancel(a.id)} style={{ marginTop: 14 }}>
              Cancel appointment
            </button>
          )}
        </div>
      ))}
    </main>
  );
}
