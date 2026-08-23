import PortalLoginForm from "@/components/PortalLoginForm";

export const metadata = { title: "Admin Login — Healthcare Appointment Manager" };

export default function AdminLoginPage() {
  return <PortalLoginForm role="ADMIN" />;
}
