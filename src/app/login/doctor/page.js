import PortalLoginForm from "@/components/PortalLoginForm";

export const metadata = { title: "Patient Login — MediAssist" };

export default function DoctorLoginPage() {
  return <PortalLoginForm role="DOCTOR" />;
}
