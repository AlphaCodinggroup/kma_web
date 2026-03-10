import AuthGuard from "@processes/auth/guard";
import QueryProvider from "@shared/providers/query-provider";
import { AuthProvider } from "@processes/auth/context";
import { getServerSession } from "@processes/auth/session";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();

  return (
    <AuthGuard>
      <AuthProvider session={session}>
        <QueryProvider>
          <div className="min-h-screen bg-background">{children}</div>
        </QueryProvider>
      </AuthProvider>
    </AuthGuard>
  );
}
