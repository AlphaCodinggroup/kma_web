import { redirect } from "next/navigation";

export default function Home() {
  // Por ahora, enviamos siempre al login.
  // En una iteración futura, acá haremos:
  // - si hay sesión -> redirect("/(dashboard)") o "/audits"
  // - si no hay sesión -> redirect("/login")
  redirect("/login");
}
