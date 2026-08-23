import PulseLine from "@/components/PulseLine";

const PORTALS = [
  {
    role: "patient",
    title: "Patient",
    icon: "❤️",
    description: "Book appointments, share symptoms in advance, and track your visit summaries.",
    href: "/login/patient",
  },
  {
    role: "doctor",
    title: "Doctor",
    icon: "🩺",
    description: "Review pre-visit summaries and manage post-visit notes.",
    href: "/login/doctor",
  },
  {
    role: "admin",
    title: "Admin",
    icon: "🗓️",
    description: "Manage doctor profiles, working hours, slot duration, and leave days.",
    href: "/login/admin",
  },
];

export const metadata = { title: "MediAssist — Choose your portal" };

export default function PortalSelectorPage() {
  return (
    <main style={{ minHeight: "100vh", background: "#f4f6f5" }}>
      <div
        style={{
          position: "relative",
          minHeight: 420,
          backgroundImage:
            "linear-gradient(135deg, rgba(15,61,50,0.92) 0%, rgba(15,61,50,0.75) 55%, rgba(15,61,50,0.55) 100%), url('https://images.unsplash.com/photo-1758691461957-474a7686e388?fm=jpg&q=70&w=2000&auto=format&fit=crop')",
          backgroundSize: "cover",
          backgroundPosition: "center 30%",
          display: "flex",
          alignItems: "center",
          paddingTop: 40,
          paddingBottom: 80,
        }}
      >
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 20px", width: "100%" }}>
          <div style={{ textAlign: "center" }}>
            <div
              className="eyebrow"
              style={{
                display: "inline-flex",
                background: "rgba(255,255,255,0.15)",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.35)",
                backdropFilter: "blur(4px)",
              }}
            >
              MediAssist
            </div>
            <h1 style={{ color: "#fff", marginTop: 14, textShadow: "0 2px 12px rgba(0,0,0,0.25)" }}>
              Which portal do you need?
            </h1>
            <div style={{ display: "flex", justifyContent: "center", color: "#fff" }}>
              <PulseLine />
            </div>
            <p style={{ marginTop: 14, color: "rgba(255,255,255,0.9)" }}>
              Choose your role to continue to the right login screen.
            </p>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 20px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 20,
            marginTop: -20,
            paddingBottom: 64,
          }}
        >
          {PORTALS.map((p) => (<a
            
              key={p.role}
              href={p.href}
              className="card"
              style={{
                textDecoration: "none",
                display: "block",
                boxShadow: "0 12px 32px rgba(15,61,50,0.14)",
                transition: "transform 0.15s ease, box-shadow 0.15s ease",
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  background: "var(--primary, #0f3d32)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 20,
                  marginBottom: 14,
                }}
              >
                {p.icon}
              </div>
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