import type { Metadata } from "next";
import LoginForm from "@features/auth/ui/LoginForm";

export const metadata: Metadata = {
  title: "Login — KMA_web",
  description: "Accedé al dashboard de auditorías",
};

export default function Page() {
  return (
    <main className="min-h-dvh grid place-items-center p-6">
      <div className="w-full max-w-sm">
        <LoginForm />
      </div>
    </main>
  );
}
