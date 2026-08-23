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

export const metadata = { title: "MediAssist — Choose your portal" };

export default function PortalSelectorPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, var(--primary-dark) 0%, var(--primary-dark) 280px, #f4f6f5 280px)",
        paddingBottom: 64,
      }}
    >
      <div style={{ maxWidth: 960, margin: "0 auto", paddingTop: 64, paddingLeft: 20, paddingRight: 20 }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div
            className="eyebrow"
            style={{
              display: "inline-flex",
              background: "rgba(255,255,255,0.15)",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.3)",
            }}
          >
            MediAssist
          </div>
          <h1 style={{ color: "#fff", marginTop: 14 }}>Which portal do you need?</h1>
          <div style={{ display: "flex", justifyContent: "center", color: "#fff" }}>
            <PulseLine />
          </div>
          <p style={{ marginTop: 14, color: "rgba(255,255,255,0.85)" }}>
            Choose your role to continue to the right login screen.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 20,
          }}
        >
            
          {PORTALS.map((p) => (<a
            
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
      </div>
    </main>
  );
}