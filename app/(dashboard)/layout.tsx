import type { Metadata } from "next";
import AppHeader from "@widgets/shell/AppHeader";
import SidebarNav from "@widgets/shell/SidebarNav";
import AuthGuard from "@processes/auth/guard"
import { getServerSession } from "@processes/auth/session";
import QueryProvider from "@shared/providers/query-provider";
import { AuthProvider } from "@processes/auth/context";

export const dynamic = "force-dynamic";

type PrivateLayoutProps = {
  children: React.ReactNode;
};

export const metadata: Metadata = {
  title: "KMApp Web Application",
};

const PrivateLayout = async ({ children }: PrivateLayoutProps) => {
  const session = await getServerSession();
  const user = session.user;

  return (
    <AuthGuard>
      <AuthProvider session={session}>
        <QueryProvider>
          <div className="bg-white text-black">
            <AppHeader role={user?.role} userName={user?.name} />
            <div className="flex h-[calc(100dvh-64px)] min-h-0">
              <SidebarNav role={user?.role} />
              <main className="flex-1 overflow-y-auto">
                <div className="mx-auto p-6">{children}</div>
              </main>
            </div>
          </div>
        </QueryProvider>
      </AuthProvider>
    </AuthGuard>
  );
};

export default PrivateLayout;
