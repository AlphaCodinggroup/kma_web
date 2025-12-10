import type { Metadata } from "next";
import AppHeader from "@widgets/shell/AppHeader";
import SidebarNav from "@widgets/shell/SidebarNav";
import AuthGuard from "@processes/auth/guard";
import { getServerSession } from "@processes/auth/session";
import QueryProvider from "@shared/providers/query-provider";

type PrivateLayoutProps = {
  children: React.ReactNode;
};

export const metadata: Metadata = {
  title: "Dashboard — KMA",
};

const PrivateLayout = async ({ children }: PrivateLayoutProps) => {
  const session = await getServerSession();
  const user = session.user;

  return (
    <AuthGuard>
      <QueryProvider>
        <div className="bg-white text-black">
          <AppHeader role={user?.role}  />
          <div className="flex h-[calc(100dvh-64px)] min-h-0">
            <SidebarNav role={user?.role} />
            <main className="flex-1 overflow-y-auto">
              <div className="mx-auto p-6">{children}</div>
            </main>
          </div>
        </div>
      </QueryProvider>
    </AuthGuard>
  );
};

export default PrivateLayout;
