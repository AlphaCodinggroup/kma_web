// ------------------------------------------------------------------------------------
// Server Route Guard for private areas.
// - Lee cookies en el servidor (incluye httpOnly) y decide acceso.
// - Si no hay sesión → redirect("/login").
// - Si hay sesión → renderiza children.
// ------------------------------------------------------------------------------------

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { serverEnv } from "@shared/config/env";

type Props = {
  children: React.ReactNode;
};

/**
 * Heurística de sesión:
 * - Preferimos el access token (cookie httpOnly).
 * - Como fallback, revisamos la cookie de flag de sesión (no sensible).
 */
async function hasActiveSession(): Promise<boolean> {
  const env = serverEnv();
  const jar = await cookies();

  // Preferimos access token (httpOnly).
  const access = jar.get(env.cookies.accessName)?.value;
  if (process.env.NEXT_PUBLIC_APP_ENV === "development") {
    console.log("[AuthGuard] access?", !!access);
  }

  return Boolean(access);
}

/**
 * AuthGuard (Server Component)
 * - Úsalo en layouts/páginas privadas, p. ej. app/(dashboard)/layout.tsx:
 *
 *   export default function Layout({ children }: { children: React.ReactNode }) {
 *     return <AuthGuard>{children}</AuthGuard>;
 *   }
 */
export default async function AuthGuard({ children }: Props) {
  // Importante: esto corre en el servidor durante el render de RSC.
  const ok = await hasActiveSession();

  if (!ok) {
    redirect("/login");
  }

  return <>{children}</>;
}
