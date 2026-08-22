"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, setSession } from "@/lib/apiClient";
import PulseLine from "@/components/PulseLine";
import HeroIllustration from "@/components/HeroIllustration";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await apiFetch("/api/auth/login", { method: "POST", body: JSON.stringify(form) });
      setSession(data.token, data.user);
      const dest = { PATIENT: "/patient/dashboard", DOCTOR: "/doctor/dashboard", ADMIN: "/admin/dashboard" }[
        data.user.role
      ];
      router.push(dest);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-split">
      <div className="auth-hero">
        <div className="auth-hero-eyebrow">Clinic Portal</div>
        <h2>Care coordinated, not scattered.</h2>
        <p>Book visits, get AI-prepared summaries, and keep every reminder on track — for patients, doctors, and admins alike.</p>
        <HeroIllustration />
      </div>

      <div className="auth-form-side">
        <div style={{ width: "100%", maxWidth: 380 }}>
          <h1>Welcome back</h1>
          <PulseLine />
          <p style={{ marginTop: 14, marginBottom: 24 }}>Log in to manage your appointments.</p>

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

          <p className="muted" style={{ textAlign: "center", marginTop: 18 }}>
            No account? <a href="/register">Register as a patient</a>
          </p>
        </div>
      </div>
    </main>
  );
}
