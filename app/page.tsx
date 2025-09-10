import { hasSession } from "@processes/auth/session";
import type { Route } from "next";
import { redirect } from "next/navigation";

export default async function Home() {
  // Por ahora, enviamos siempre al login.
  // En una iteración futura, acá haremos:
  // - si hay sesión -> redirect("/(dashboard)") o "/audits"
  // - si no hay sesión -> redirect("/login")
  const ok = await hasSession();
  redirect((ok ? "/dashboard" : "/login") as Route);
}
