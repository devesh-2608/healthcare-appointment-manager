import { redirect } from "next/navigation";

// The generic /login route now just sends people to the portal selector,
// since login is role-specific: /login/patient, /login/doctor, /login/admin.
export default function LoginRedirect() {
  redirect("/portal");
}
