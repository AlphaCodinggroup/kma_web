import type { Metadata } from "next";
import AppHeader from "@widgets/shell/AppHeader";
import SidebarNav from "@widgets/shell/SidebarNav";
import AuthGuard from "@processes/auth/guard";
import QueryProvider from "@shared/providers/query-provider";

type PrivateLayoutProps = {
  children: React.ReactNode;
};

export const metadata: Metadata = {
  title: "Dashboard — KMA",
};

const PrivateLayout: React.FC<PrivateLayoutProps> = ({ children }) => {
  return (
    <AuthGuard>
      <QueryProvider>
        <div className="bg-white text-black">
          <AppHeader />
          <div className="flex h-[calc(100dvh-64px)] min-h-0">
            <SidebarNav />
            <main className="flex-1 overflow-y-hidden">
              <div className="mx-auto p-6">{children}</div>
            </main>
          </div>
        </div>
      </QueryProvider>
    </AuthGuard>
  );
};

export default PrivateLayout;
