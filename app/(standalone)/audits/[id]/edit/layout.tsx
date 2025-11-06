import AuthGuard from "@processes/auth/guard";
import QueryProvider from "@shared/providers/query-provider";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <QueryProvider>
        <div className="min-h-screen bg-background">{children}</div>;
      </QueryProvider>
    </AuthGuard>
  );
}
