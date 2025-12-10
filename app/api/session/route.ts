// -----------------------------------------------------------------------------------
// Route Handler (App Router) para iniciar sesión con AWS Cognito (USER_PASSWORD_AUTH).
// - Recibe { username, password } via POST (JSON).
// - Llama al usecase server-side y setea cookies httpOnly: access / refresh / session.
// - Mensajes visibles en inglés; comentarios en español.
// - Incluye DELETE para cerrar sesión (borra cookies).
// -----------------------------------------------------------------------------------

import { NextResponse } from "next/server";
import { z } from "zod";

import { cookies } from "next/headers";
import { serverEnv } from "@shared/config/env";
import type { ApiError } from "@shared/interceptors/error";
import {
  initiateAuthWithPassword,
  globalSignOut,
} from "@features/auth/api/cognito.repo.impl";

// -----------------------------
// Schema de entrada
// -----------------------------
const BodySchema = z.object({
  username: z.string().min(1, "username is required"),
  password: z.string().min(1, "password is required"),
});

// -----------------------------
// Helpers de cookies
// -----------------------------
const isLocalEnv =
  process.env.NEXT_PUBLIC_APP_ENV === "development" ||
  process.env.VERCEL_ENV === "development";

/** Construye opciones comunes de cookie según .env (secure, sameSite, domain). */
function commonCookieOptions() {
  const env = serverEnv();

  // Inferencia simple de "ambiente local"

  // Si es local, forzamos secure=false para que el navegador setee las cookies en HTTP
  const sameSiteLower = (env.cookies.sameSite.toLowerCase() ?? "lax") as
    | "lax"
    | "strict"
    | "none";

  const secure = isLocalEnv ? false : env.cookies.secure;
  const domain = isLocalEnv ? undefined : env.cookies.domain;
  return {
    httpOnly: true as const,
    secure,
    sameSite: sameSiteLower,
    domain,
    path: "/" as const,
  };
}

/** Setea cookies httpOnly para sesión: access, refresh y una flag de sesión. */
function setSessionCookies(
  res: NextResponse,
  params: {
    accessToken: string;
    refreshToken?: string;
    accessTtlSeconds: number;
  }
) {
  const env = serverEnv();
  const base = commonCookieOptions();

  // Access token (TTL desde Cognito, p.ej. 3600s)
  res.cookies.set(env.cookies.accessName, params.accessToken, {
    ...base,
    maxAge: params.accessTtlSeconds,
  });

  // Refresh token (TTL configurable en user pool; usamos fallback de 30 días si no viene)
  if (params.refreshToken) {
    const THIRTY_DAYS = 60 * 60 * 24 * 30;
    res.cookies.set(env.cookies.refreshName, params.refreshToken, {
      ...base,
      // Si la app luego conoce el TTL real de refresh en server, cámbiese aquí.
      maxAge: THIRTY_DAYS,
    });
  }

  // Cookie de marca de sesión (opcional, no sensible) para checks rápidos en UI/SSR
  res.cookies.set(env.cookies.sessionName, "1", {
    ...base,
    httpOnly: false, // puede ser leída por el cliente como simple flag
    maxAge: params.accessTtlSeconds,
  });
}

/** Borra todas las cookies de sesión. */
function clearSessionCookiesOnResponse(res: NextResponse) {
  const env = serverEnv();
  const base = commonCookieOptions();

  res.cookies.set(env.cookies.accessName, "", { ...base, maxAge: 0 });
  res.cookies.set(env.cookies.refreshName, "", { ...base, maxAge: 0 });
  // La flag de sesión no es httpOnly; igual la limpiamos
  res.cookies.set(env.cookies.sessionName, "", {
    ...base,
    httpOnly: false,
    maxAge: 0,
  });
}

// -----------------------------
// Handlers HTTP
// -----------------------------

/**
 * POST /api/session
 * Body: { username, password }
 * 200: { ok: true }
 * 400/401/...: { ok: false, code, message }
 */
export async function POST(req: Request) {
  try {
    // Parseo y validación de body
    const json = await req.json().catch(() => ({}));
    const { username, password } = BodySchema.parse(json);

    // Autenticación contra Cognito
    const tokens = await initiateAuthWithPassword(username, password);

    // Seteo de cookies httpOnly
    const res = NextResponse.json({ ok: true } as const, { status: 200 });
    setSessionCookies(res, {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken ?? "",
      accessTtlSeconds: tokens.expiresInSeconds,
    });

    // Respondemos éxito sin exponer tokens
    return res;
  } catch (e) {
    const err = e as ApiError;
    // Si el error vino del proveedor con mensaje claro (p.ej., credenciales inválidas),
    // lo exponemos; por defecto 401 para UNAUTHORIZED / NotAuthorizedException.
    const status =
      err.code === "UNAUTHORIZED" || err.code === "NotAuthorizedException"
        ? 401
        : err.code === "BAD_REQUEST" || err.code === "VALIDATION_ERROR"
        ? 400
        : err.code === "RATE_LIMITED"
        ? 429
        : err.code === "FORBIDDEN"
        ? 403
        : err.code === "NOT_FOUND"
        ? 404
        : err.code === "SERVER_ERROR"
        ? 502
        : 400;

    const res = NextResponse.json(
      {
        ok: false as const,
        code: err.code ?? "UNKNOWN_ERROR",
        message:
          err.message ??
          "We could not complete the authentication process. Please try again.",
      },
      { status }
    );
    // En fallos de auth podría ser útil limpiar cualquier residuo
    if (status === 401) {
      clearSessionCookiesOnResponse(res);
    }
    return res;
  }
}

/**
 * DELETE /api/session
 * 204: borra cookies y no retorna body.
 */
export async function DELETE() {
  const res = new NextResponse(null, { status: 204 });
  try {
    const env = serverEnv();
    const jar = await cookies();
    const access = jar.get(env.cookies.accessName)?.value;
    if (access) {
      await globalSignOut(access);
    }
  } catch (err) {
    console.error("[api/session] global sign out failed:", err);
  } finally {
    clearSessionCookiesOnResponse(res);
  }
  return res;
}
