import type { Metadata } from "next";
import LoginForm from "@features/auth/ui/LoginForm";
import { serverEnv } from "@shared/config/env";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Login — KMA_web",
  description: "Access the audit dashboard",
};

const Page: React.FC = async () => {
  const env = serverEnv();
  const jar = await cookies();
  const hasSessionFlag = jar.get(env.cookies.sessionName)?.value === "1";
  const hasAccess = !!jar.get(env.cookies.accessName)?.value;

  if (hasSessionFlag || hasAccess) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-dvh grid place-items-center p-6">
      <div className="w-full max-w-sm">
        <LoginForm />
      </div>
    </main>
  );
};

export default Page;
