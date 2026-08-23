import PortalLoginForm from "@/components/PortalLoginForm";

export const metadata = { title: "Patient Login — MediAssist" };

export default function AdminLoginPage() {
  return <PortalLoginForm role="ADMIN" />;
}
