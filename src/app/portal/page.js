import PulseLine from "@/components/PulseLine";

const PORTALS = [
  {
    role: "patient",
    title: "Patient",
    description: "Book appointments, share symptoms in advance, and track your visit summaries.",
    href: "/login/patient",
  },
  {
    role: "doctor",
    title: "Doctor",
    description: "Review AI-prepared pre-visit summaries and manage post-visit notes.",
    href: "/login/doctor",
  },
  {
    role: "admin",
    title: "Admin",
    description: "Manage doctor profiles, working hours, slot duration, and leave days.",
    href: "/login/admin",
  },
];

export const metadata = { title: "Healthcare Appointment Manager — Choose your portal" };

export default function PortalSelectorPage() {
  return (
    <main className="page shell" style={{ maxWidth: 960, paddingTop: 64 }}>
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <div className="eyebrow" style={{ display: "inline-flex" }}>
          Healthcare Appointment Manager
        </div>
        <h1>Which portal do you need?</h1>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <PulseLine />
        </div>
        <p style={{ marginTop: 14 }}>Choose your role to continue to the right login screen.</p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 20,
        }}
      >
        {PORTALS.map((p) => (
          <a
            key={p.role}
            href={p.href}
            className="card"
            style={{
              textDecoration: "none",
              display: "block",
              transition: "transform 0.15s ease, box-shadow 0.15s ease",
            }}
          >
            <span className="badge badge-primary">{p.title} Portal</span>
            <h3 style={{ margin: "14px 0 8px" }}>{p.title} login</h3>
            <p style={{ margin: 0 }}>{p.description}</p>
            <p style={{ marginTop: 16, color: "var(--primary)", fontWeight: 600 }}>Continue →</p>
          </a>
        ))}
      </div>
    </main>
  );
}
