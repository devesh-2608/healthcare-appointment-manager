"use client";
import { useEffect, useState } from "react";
import { apiFetch, getUser, logout } from "@/lib/apiClient";
import { useRouter } from "next/navigation";
import PulseLine from "@/components/PulseLine";

export default function AdminDashboard() {
  const router = useRouter();
  const [doctors, setDoctors] = useState([]);
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({
    name: "", email: "", password: "", specialisation: "", slotDurationMinutes: 30,
  });
  const [leaveDate, setLeaveDate] = useState({});
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const u = getUser();
    if (!u) return router.push("/login");
    setUser(u);
    apiFetch("/api/doctors").then((d) => setDoctors(d.doctors));
  }, [router]);

  async function createDoctor(e) {
    e.preventDefault();
    setError(""); setMessage("");
    try {
      const workingHours = [1, 2, 3, 4, 5].map((dayOfWeek) => ({
        dayOfWeek, startTime: "09:00", endTime: "17:00",
      }));
      await apiFetch("/api/doctors", {
        method: "POST",
        body: JSON.stringify({ ...form, workingHours }),
      });
      setMessage("Doctor created.");
      const d = await apiFetch("/api/doctors");
      setDoctors(d.doctors);
      setForm({ name: "", email: "", password: "", specialisation: "", slotDurationMinutes: 30 });
    } catch (err) {
      setError(err.message);
    }
  }

  async function markLeave(doctorId) {
    const date = leaveDate[doctorId];
    if (!date) return;
    const data = await apiFetch(`/api/doctors/${doctorId}/leave`, {
      method: "POST",
      body: JSON.stringify({ date }),
    });
    setMessage(`Leave marked. ${data.affectedAppointments.length} patient(s) notified.`);
  }

  return (
    <main className="page shell">
      <div className="hero-banner">
        <div>
          <div className="hero-banner-eyebrow">Admin Portal</div>
          <h1>{user?.name}</h1>
          <PulseLine />
        </div>
        <button className="btn-ghost" onClick={() => { logout(); router.push("/login"); }}>
          Log out
        </button>
      </div>

      <div className="card">
        <h2 style={{ marginBottom: 16 }}>Add doctor</h2>
        <form onSubmit={createDoctor}>
          <div className="field-row">
            <div className="field">
              <label>Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="field">
              <label>Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Specialisation</label>
              <input value={form.specialisation} onChange={(e) => setForm({ ...form, specialisation: e.target.value })} required />
            </div>
            <div className="field">
              <label>Password</label>
              <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} />
            </div>
            <div className="field" style={{ maxWidth: 140 }}>
              <label>Slot minutes</label>
              <input
                type="number"
                value={form.slotDurationMinutes}
                onChange={(e) => setForm({ ...form, slotDurationMinutes: Number(e.target.value) })}
              />
            </div>
          </div>
          {error && <p className="error-text">{error}</p>}
          {message && <p className="success-text">{message}</p>}
          <button type="submit" className="btn-primary" style={{ marginTop: 4 }}>
            Create doctor (default Mon–Fri 9–5)
          </button>
        </form>
      </div>

      <h2 style={{ margin: "28px 0 16px" }}>Doctors</h2>

      {doctors.length === 0 && (
        <div className="empty-state card">
          <h3>No doctors yet</h3>
          <p>Add your first doctor profile above.</p>
        </div>
      )}

      {doctors.map((d) => (
        <div key={d.id} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h3>Dr. {d.user.name}</h3>
            <span className="badge badge-primary" style={{ marginTop: 6 }}>{d.specialisation}</span>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="date" onChange={(e) => setLeaveDate({ ...leaveDate, [d.id]: e.target.value })} style={{ width: "auto" }} />
            <button className="btn-danger btn-sm" onClick={() => markLeave(d.id)}>
              Mark on leave
            </button>
          </div>
        </div>
      ))}
    </main>
  );
}
