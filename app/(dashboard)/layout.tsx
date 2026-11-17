import type { Metadata } from "next";
import AppShell from "@widgets/shell/AppShell";
import { Suspense } from "react";
import AuthGuard from "@processes/auth/guard"
import { getServerSession } from "@processes/auth/session";
import QueryProvider from "@shared/providers/query-provider";
import { AuthProvider } from "@processes/auth/context";

export const dynamic = "force-dynamic";

type PrivateLayoutProps = {
  children: React.ReactNode;
};

export const metadata: Metadata = {
  title: "KMA — Audit workspace",
};

const PrivateLayout = async ({ children }: PrivateLayoutProps) => {
  const session = await getServerSession();
  const user = session.user;

  return (
    <AuthGuard>
      <AuthProvider session={session}>
        <QueryProvider>
          <Suspense>
            <AppShell role={user?.role} userName={user?.name}>{children}</AppShell>
          </Suspense>
        </QueryProvider>
      </AuthProvider>
    </AuthGuard>
  );
};

export default PrivateLayout;
