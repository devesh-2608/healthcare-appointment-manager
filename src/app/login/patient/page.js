import PortalLoginForm from "@/components/PortalLoginForm";

export const metadata = { title: "Patient Login — Healthcare Appointment Manager" };

export default function PatientLoginPage() {
  return <PortalLoginForm role="PATIENT" />;
}