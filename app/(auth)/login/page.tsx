import type { Metadata } from "next";
import Image from "next/image";
import LoginForm from "@features/auth/ui/LoginForm";
import { serverEnv } from "@shared/config/env";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ThemeToggle } from "@shared/ui/theme-toggle";
import { BrandMark } from "@shared/ui/brand-mark";

export const metadata: Metadata = {
  title: "Login — KMA",
  description: "Access the audit dashboard",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

const Page: React.FC = async () => {
  const env = serverEnv();
  const jar = await cookies();
  if (jar.get(env.cookies.accessName)?.value) redirect("/dashboard");

  return (
    <main className="grid min-h-dvh bg-[var(--kma-surface)] text-[var(--kma-fg)] lg:grid-cols-[1.15fr_1fr]">
      <section className="relative hidden min-h-dvh flex-col overflow-hidden border-r border-[var(--kma-border)] bg-[var(--kma-bg)] px-10 py-10 text-[var(--kma-fg)] lg:flex xl:px-14" aria-labelledby="workspace-introduction">
        <BrandMark />
        <div className="relative z-10 mt-16 max-w-lg">
          <h2 id="workspace-introduction" className="kma-page-title text-[50px] leading-[1.05] xl:text-[60px]">From fieldwork<br />to final report.</h2>
          <p className="mt-5 max-w-sm text-base leading-relaxed text-[var(--kma-muted)]">One workspace to organize your projects, review findings, and deliver clear reports.</p>
        </div>
        <div className="relative -mx-8 min-h-[300px] flex-1 xl:-mx-12">
          <Image src="/images/daylight-section.webp" alt="" fill priority sizes="(min-width: 1024px) 54vw, 0px" className="object-contain object-bottom" />
        </div>
        <div className="relative z-10 mt-5 flex items-center justify-between gap-4 border-t border-[var(--kma-border)] pt-5 text-xs text-[var(--kma-muted)]"><p>KMA · Project and audit management</p><span aria-hidden="true" className="h-0.5 w-12 bg-[var(--kma-accent)]" /></div>
      </section>
      <div className="relative flex min-h-dvh items-center justify-center px-5 py-24 sm:px-10 lg:px-12">
        <div className="absolute left-5 right-5 top-5 flex items-center justify-between sm:left-10 sm:right-10 lg:justify-end lg:top-8"><BrandMark className="lg:hidden" /><ThemeToggle /></div>
        <div className="w-full max-w-[380px]">
          <LoginForm />
          <p className="mt-8 border-t border-[var(--kma-border)] pt-5 text-sm leading-relaxed text-[var(--kma-muted)]">Access is provided by your organization. Use the username assigned to you.</p>
        </div>
      </div>
    </main>
  );
};

export default Page;
