import type { Metadata } from "next";
import { ensureAuthenticated } from "@processes/auth/session";

type PrivateLayoutProps = {
  children: React.ReactNode;
};

export const metadata: Metadata = {
  title: "Dashboard — KMA_web",
};

const PrivateLayout: React.FC<PrivateLayoutProps> = async ({ children }) => {
  // Guard server-side (redirige a /login si no hay sesión)
  //! DESCOMENTAR CUANDO ESTEN BACKEND Y AUTH LISTOS
  // await ensureAuthenticated();

  // Si pasa el guard, renderizamos normalmente
  return <main className="min-h-dvh bg-white text-black">{children}</main>;
};

export default PrivateLayout;
