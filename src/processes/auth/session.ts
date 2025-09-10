import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Route } from "next";
import { env } from "@shared/config/env";

/** Compatibilidad Next 14 (sync) / Next 15 (async) */
async function getCookieStore() {
  const c = cookies() as any;
  return typeof c?.then === "function" ? await c : c;
}

/** Lee si existe access token en cookie httpOnly */
export async function hasSession(): Promise<boolean> {
  const store = await getCookieStore();
  const access = store.get(env.AUTH_ACCESS_COOKIE)?.value;
  return Boolean(access);
}

/** Redirige a /login si NO hay sesión */
export async function ensureAuthenticated() {
  const ok = await hasSession();
  if (!ok) {
    redirect("/login" as Route);
  }
}

/** Si YA hay sesión, redirige al destino (p.ej. desde la pantalla de login) */
export async function redirectIfAuthenticated(
  to: Route = "/dashboard" as Route
) {
  const ok = await hasSession();
  if (ok) redirect(to);
}
