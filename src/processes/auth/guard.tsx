// ------------------------------------------------------------------------------------
// Server Route Guard for private areas.
// - Lee cookies en el servidor (incluye httpOnly) y decide acceso.
// - Si no hay sesión → redirect("/login").
// - Si hay sesión → renderiza children.
// ------------------------------------------------------------------------------------

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { serverEnv } from "@shared/config/env";
import { verifyAccessToken } from "@shared/auth/verify-access-token";

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
  if (!access) return false;

  try {
    await verifyAccessToken(access);
    return true;
  } catch {
    return false;
  }
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
