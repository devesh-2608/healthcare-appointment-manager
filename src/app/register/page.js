"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, setSession } from "@/lib/apiClient";
import PulseLine from "@/components/PulseLine";
import HeroIllustration from "@/components/HeroIllustration";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await apiFetch("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ ...form, role: "PATIENT" }),
      });
      setSession(data.token, data.user);
      router.push("/patient/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const fields = [
    { key: "name", label: "Full name", placeholder: "Jordan Reyes", type: "text", required: true },
    { key: "email", label: "Email", placeholder: "you@example.com", type: "email", required: true },
    { key: "phone", label: "Phone (optional)", placeholder: "+1 555 000 0000", type: "text", required: false },
  ];

  return (
    <main className="auth-split">
      <div className="auth-hero">
        <div className="auth-hero-eyebrow">Clinic Portal</div>
        <h2>Your care, all in one place.</h2>
        <p>Create an account to book appointments, share symptoms ahead of time, and get reminders that actually help.</p>
        <HeroIllustration />
      </div>

      <div className="auth-form-side">
        <div style={{ width: "100%", maxWidth: 380 }}>
          <h1>Create your account</h1>
          <PulseLine />
          <p style={{ marginTop: 14, marginBottom: 24 }}>Book appointments and track your care in one place.</p>

          <div className="auth-card">
            <form onSubmit={handleSubmit}>
              {fields.map((f) => (
                <div className="field" key={f.key}>
                  <label htmlFor={f.key}>{f.label}</label>
                  <input
                    id={f.key}
                    placeholder={f.placeholder}
                    type={f.type}
                    value={form[f.key]}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                    required={f.required}
                  />
                </div>
              ))}
              <div className="field">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  placeholder="At least 8 characters"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  minLength={8}
                />
              </div>
              {error && <p className="error-text">{error}</p>}
              <button type="submit" className="btn-primary btn-block" disabled={loading} style={{ marginTop: 6 }}>
                {loading ? "Creating account…" : "Register"}
              </button>
            </form>
          </div>

          <p className="muted" style={{ textAlign: "center", marginTop: 18 }}>
            Already registered? <a href="/login/patient">Log in</a>
          </p>
        </div>
      </div>
    </main>
  );
}
