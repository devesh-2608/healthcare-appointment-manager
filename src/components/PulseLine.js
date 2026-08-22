// The pulse-line: a quiet heartbeat-trace motif used under page titles
// across every portal. It's the one recurring signature element tying
// the patient/doctor/admin screens together.
export default function PulseLine({ className = "pulse-line" }) {
  return (
    <svg className={className} viewBox="0 0 84 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M0 7H20L25 1L31 13L36 7H48L52 3L56 11L60 7H84"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
