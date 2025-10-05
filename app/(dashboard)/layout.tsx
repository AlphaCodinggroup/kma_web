import type { Metadata } from "next";
import { ensureAuthenticated } from "@processes/auth/session";
import AppHeader from "@widgets/shell/AppHeader";
import SidebarNav from "@widgets/shell/SidebarNav";

type PrivateLayoutProps = {
  children: React.ReactNode;
};

export const metadata: Metadata = {
  title: "Dashboard — KMA_web",
};

const HEADER_HEIGHT = 56;

const PrivateLayout: React.FC<PrivateLayoutProps> = async ({ children }) => {
  // Guard server-side (redirige a /login si no hay sesión)
  //! DESCOMENTAR CUANDO ESTEN BACKEND Y AUTH LISTOS
  // await ensureAuthenticated();

  // Si pasa el guard, renderizamos normalmente
  return (
    <div className="bg-white text-black">
      <AppHeader />
      <div className="flex h-[calc(100dvh-64px)] min-h-0">
        <SidebarNav />
        <main className="flex-1 overflow-y-hidden">
          <div className="mx-auto p-6">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default PrivateLayout;
