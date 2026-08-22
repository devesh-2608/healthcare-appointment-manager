// A decorative illustration for the auth split-screen panel: layered
// soft shapes, a pulse trace, and a calendar/cross motif standing in for
// stock photography (which we can't license into the app). Purely
// decorative — aria-hidden.
export default function HeroIllustration() {
  return (
    <svg viewBox="0 0 480 560" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style={{ width: "100%", height: "auto" }}>
      <circle cx="360" cy="120" r="150" fill="white" fillOpacity="0.08" />
      <circle cx="80" cy="440" r="110" fill="white" fillOpacity="0.07" />
      <circle cx="420" cy="470" r="60" fill="white" fillOpacity="0.09" />

      {/* calendar card */}
      <g transform="translate(90,150)">
        <rect x="0" y="0" width="230" height="190" rx="18" fill="white" fillOpacity="0.95" />
        <rect x="0" y="0" width="230" height="46" rx="18" fill="#DD8A45" />
        <rect x="0" y="30" width="230" height="16" fill="#DD8A45" />
        <circle cx="30" cy="23" r="6" fill="white" />
        <circle cx="52" cy="23" r="6" fill="white" />
        {Array.from({ length: 21 }).map((_, i) => {
          const col = i % 7;
          const row = Math.floor(i / 7);
          const active = i === 10;
          return (
            <rect
              key={i}
              x={16 + col * 29}
              y={70 + row * 34}
              width="20"
              height="20"
              rx="5"
              fill={active ? "#2F6F62" : "#E3EEEA"}
            />
          );
        })}
      </g>

      {/* pulse trace ribbon */}
      <path
        d="M20 330 H120 L145 280 L175 380 L200 330 H260 L280 300 L305 355 L325 330 H460"
        stroke="white"
        strokeOpacity="0.85"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* cross / care badge */}
      <g transform="translate(300,60)">
        <circle cx="40" cy="40" r="40" fill="white" fillOpacity="0.95" />
        <rect x="33" y="18" width="14" height="44" rx="4" fill="#2F6F62" />
        <rect x="18" y="33" width="44" height="14" rx="4" fill="#2F6F62" />
      </g>

      {/* small orbit dots */}
      <circle cx="60" cy="90" r="7" fill="white" fillOpacity="0.7" />
      <circle cx="440" cy="250" r="5" fill="white" fillOpacity="0.6" />
      <circle cx="380" cy="400" r="6" fill="white" fillOpacity="0.6" />
    </svg>
  );
}
