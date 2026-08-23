"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, setSession } from "@/lib/apiClient";
import PulseLine from "@/components/PulseLine";
import HeroIllustration from "@/components/HeroIllustration";

const ROLE_CONFIG = {
  PATIENT: {
    label: "Patient Portal",
    heroTitle: "Care coordinated, not scattered.",
    heroSubtitle:
      "Book visits, get AI-prepared summaries, and keep every reminder on track.",
    dashboard: "/patient/dashboard",
    showRegister: true,
  },
  DOCTOR: {
    label: "Doctor Portal",
    heroTitle: "Every visit, prepared in advance.",
    heroSubtitle:
      "See AI-generated pre-visit summaries and turn your notes into patient-friendly follow-ups in one click.",
    dashboard: "/doctor/dashboard",
    showRegister: false,
  },
  ADMIN: {
    label: "Admin Portal",
    heroTitle: "Run the clinic from one place.",
    heroSubtitle:
      "Manage doctor profiles, working hours, and leave days — and keep patients informed automatically.",
    dashboard: "/admin/dashboard",
    showRegister: false,
  },
};

export default function PortalLoginForm({ role }) {
  const router = useRouter();
  const config = ROLE_CONFIG[role];
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await apiFetch("/api/auth/login", { method: "POST", body: JSON.stringify(form) });

      if (data.user.role !== role) {
        const actualConfig = ROLE_CONFIG[data.user.role];
        setError(
          actualConfig
            ? `This account is registered as a ${actualConfig.label.replace(" Portal", "")}. Please log in from the ${actualConfig.label}.`
            : "This account doesn't have access to this portal."
        );
        setLoading(false);
        return;
      }

      setSession(data.token, data.user);
      router.push(config.dashboard);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <main className="auth-split">
      <div className="auth-hero">
        <div className="auth-hero-eyebrow">{config.label}</div>
        <h2>{config.heroTitle}</h2>
        <p>{config.heroSubtitle}</p>
        <HeroIllustration />
      </div>

      <div className="auth-form-side">
        <div style={{ width: "100%", maxWidth: 380 }}>
          <h1>Welcome back</h1>
          <PulseLine />
          <p style={{ marginTop: 14, marginBottom: 24 }}>Log in to the {config.label.toLowerCase()}.</p>

          <div className="auth-card">
            <form onSubmit={handleSubmit}>
              <div className="field">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  placeholder="you@example.com"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  placeholder="••••••••"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                />
              </div>
              {error && <p className="error-text">{error}</p>}
              <button type="submit" className="btn-primary btn-block" disabled={loading} style={{ marginTop: 6 }}>
                {loading ? "Logging in…" : "Log in"}
              </button>
            </form>
          </div>

          {config.showRegister ? (
            <p className="muted" style={{ textAlign: "center", marginTop: 18 }}>
              No account? <a href="/register">Register as a patient</a>
            </p>
          ) : (
            <p className="muted" style={{ textAlign: "center", marginTop: 18 }}>
              {role === "DOCTOR"
                ? "Doctor accounts are created by the clinic admin."
                : "Admin accounts are provisioned by the clinic."}
            </p>
          )}

          <p className="muted" style={{ textAlign: "center", marginTop: 10 }}>
            <a href="/portal">← Choose a different portal</a>
          </p>
        </div>
      </div>
    </main>
  );
}
