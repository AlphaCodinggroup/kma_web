import type { Route } from "next";
import { redirect } from "next/navigation";

const Home: React.FC = async () => {
  // Por ahora, enviamos siempre al login.
  // En una iteración futura, acá haremos:
  // - si hay sesión -> redirect("/(dashboard)") o "/audits"
  // - si no hay sesión -> redirect("/login")
  // const ok = await hasSession();
  redirect("/login" as Route);
};

export default Home;
