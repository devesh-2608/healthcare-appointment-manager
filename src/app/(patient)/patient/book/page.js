"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import { useRouter } from "next/navigation";
import PulseLine from "@/components/PulseLine";

export default function BookAppointment() {
  const router = useRouter();
  const [specialisation, setSpecialisation] = useState("");
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [symptomText, setSymptomText] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function searchDoctors() {
    setError("");
    const data = await apiFetch(`/api/doctors${specialisation ? `?specialisation=${encodeURIComponent(specialisation)}` : ""}`);
    setDoctors(data.doctors);
  }

  useEffect(() => {
    searchDoctors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadSlots(doctor, forDate) {
    setSelectedDoctor(doctor);
    setDate(forDate);
    setSelectedSlot(null);
    if (!forDate) return;
    const data = await apiFetch(`/api/doctors/${doctor.id}/slots?date=${forDate}`);
    setSlots(data.slots);
  }

  async function confirmBooking() {
    setError("");
    setSubmitting(true);
    try {
      await apiFetch("/api/appointments", {
        method: "POST",
        body: JSON.stringify({ doctorId: selectedDoctor.id, startTime: selectedSlot, symptomText }),
      });
      router.push("/patient/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="page shell">
      <div className="hero-banner">
        <div>
          <div className="hero-banner-eyebrow">Patient Portal</div>
          <h1>Book an appointment</h1>
          <PulseLine />
          <p style={{ marginTop: 14, marginBottom: 0, color: "rgba(255,255,255,0.85)" }}>
            Search by specialisation or symptom, pick a time, and describe your symptoms.
          </p>
        </div>
      </div>

      <div className="card" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input
          placeholder="Search by specialisation or symptom (e.g. Cardiology, skin rash)"
          value={specialisation}
          onChange={(e) => setSpecialisation(e.target.value)}
          style={{ flex: 1, minWidth: 220 }}
        />
        <button className="btn-primary" onClick={searchDoctors}>
          Search
        </button>
      </div>

      {doctors.length === 0 && (
        <div className="empty-state card">
          <h3>No doctors found</h3>
          <p>Try a different specialisation, or leave the search blank to see everyone.</p>
        </div>
      )}

      {doctors.map((d) => (
        <div key={d.id} className={`card ${selectedDoctor?.id === d.id ? "card-selected" : ""}`}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <div>
              <h3>Dr. {d.user.name}</h3>
              <span className="badge badge-primary" style={{ marginTop: 6 }}>{d.specialisation}</span>
            </div>
            <input type="date" onChange={(e) => loadSlots(d, e.target.value)} style={{ width: "auto" }} />
          </div>

          {selectedDoctor?.id === d.id && date && (
            <div style={{ marginTop: 16 }}>
              {slots.length === 0 && <p className="muted">No slots available this day.</p>}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {slots.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSelectedSlot(s)}
                    className={`chip ${selectedSlot === s ? "chip-selected" : ""}`}
                  >
                    {new Date(s).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}

      {selectedSlot && (
        <div className="card" style={{ marginTop: 8 }}>
          <h3 style={{ marginBottom: 10 }}>Describe your symptoms</h3>
          <textarea
            value={symptomText}
            onChange={(e) => setSymptomText(e.target.value)}
            rows={4}
            placeholder="e.g. Persistent headache for 3 days, mild fever, sensitivity to light"
          />
          <p className="muted" style={{ marginTop: 8 }}>
            An AI pre-visit summary with urgency level will be prepared for your doctor.
          </p>
          {error && <p className="error-text">{error}</p>}
          <button
            onClick={confirmBooking}
            disabled={submitting || !symptomText}
            className="btn-primary"
            style={{ marginTop: 10 }}
          >
            {submitting ? "Booking…" : "Confirm booking"}
          </button>
        </div>
      )}
    </main>
  );
}
