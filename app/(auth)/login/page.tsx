import type { Metadata } from "next";
import LoginForm from "@features/auth/ui/LoginForm";
import { serverEnv } from "@shared/config/env";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Login — KMA_web",
  description: "Access the audit dashboard",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

const Page: React.FC = async () => {
  const env = serverEnv();
  const jar = await cookies();

  const hasAccess = !!jar.get(env.cookies.accessName)?.value;

  if (hasAccess) {
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
