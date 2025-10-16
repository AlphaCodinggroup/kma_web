import type { Metadata } from "next";
import AppHeader from "@widgets/shell/AppHeader";
import SidebarNav from "@widgets/shell/SidebarNav";
import AuthGuard from "@processes/auth/guard";

type PrivateLayoutProps = {
  children: React.ReactNode;
};

export const metadata: Metadata = {
  title: "Dashboard — KMA_web",
};

const PrivateLayout: React.FC<PrivateLayoutProps> = ({ children }) => {
  return (
    <AuthGuard>
      <div className="bg-white text-black">
        <AppHeader />
        <div className="flex h-[calc(100dvh-64px)] min-h-0">
          <SidebarNav />
          <main className="flex-1 overflow-y-hidden">
            <div className="mx-auto p-6">{children}</div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
};

export default PrivateLayout;
