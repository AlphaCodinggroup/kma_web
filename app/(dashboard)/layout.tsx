import type { Metadata } from "next";
import { ensureAuthenticated } from "@processes/auth/session";

export const metadata: Metadata = {
  title: "Dashboard — KMA_web",
};

export default async function PrivateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Guard server-side (redirige a /login si no hay sesión)
  await ensureAuthenticated();

  // Si pasa el guard, renderizamos normalmente
  return <main className="min-h-dvh bg-white text-black">{children}</main>;
}
