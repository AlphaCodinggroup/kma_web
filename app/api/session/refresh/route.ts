// -----------------------------------------------------------------------------------
// Route Handler para refrescar la sesión usando AWS Cognito (REFRESH_TOKEN_AUTH).
// - Lee el refresh token desde cookie httpOnly.
// - Si es válido: genera un nuevo access token y actualiza cookies.
// - Si falla: responde 401 y limpia cookies de sesión.
// -----------------------------------------------------------------------------------

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { serverEnv } from "@shared/config/env";
import type { ApiError } from "@shared/interceptors/error";
import { initiateAuthWithRefreshToken } from "@features/auth/api/cognito.repo.impl";

// -----------------------------
// Helpers de cookies (idénticos a /api/session)
// -----------------------------

/** Normaliza opciones comunes de cookie y convierte sameSite a minúsculas. */
function commonCookieOptions() {
  const env = serverEnv();

  const sameSiteLower = (env.cookies.sameSite.toLowerCase() ?? "lax") as
    | "lax"
    | "strict"
    | "none";

  return {
    httpOnly: true as const,
    secure: env.cookies.secure,
    sameSite: sameSiteLower,
    domain: env.cookies.domain,
    path: "/" as const,
  };
}

/** Setea cookies httpOnly (access/refresh) y flag de sesión. */
async function setSessionCookies(params: {
  accessToken: string;
  refreshToken?: string;
  accessTtlSeconds: number;
}) {
  const env = serverEnv();
  const jar = await cookies();
  const base = commonCookieOptions();

  // Access
  jar.set(env.cookies.accessName, params.accessToken, {
    ...base,
    maxAge: params.accessTtlSeconds,
  });

  // Refresh (si el proveedor devuelve uno nuevo — no siempre ocurre en refresh)
  if (params.refreshToken) {
    const THIRTY_DAYS = 60 * 60 * 24 * 30;
    jar.set(env.cookies.refreshName, params.refreshToken, {
      ...base,
      maxAge: THIRTY_DAYS,
    });
  }

  // Flag de sesión (no sensible)
  jar.set(env.cookies.sessionName, "1", {
    ...base,
    httpOnly: false,
    maxAge: params.accessTtlSeconds,
  });
}

/** Limpia todas las cookies de sesión. */
async function clearSessionCookies() {
  const env = serverEnv();
  const jar = await cookies();
  const base = commonCookieOptions();

  jar.set(env.cookies.accessName, "", { ...base, maxAge: 0 });
  jar.set(env.cookies.refreshName, "", { ...base, maxAge: 0 });
  jar.set(env.cookies.sessionName, "", { ...base, httpOnly: false, maxAge: 0 });
}

// -----------------------------
// Handler HTTP
// -----------------------------

/**
 * POST /api/session/refresh
 * 200: { ok: true }
 * 401: { ok: false, code, message } + cookies limpiadas
 * Otras: { ok: false, code, message }
 */
export async function POST() {
  const env = serverEnv();
  const jar = await cookies();
  const refresh = jar.get(env.cookies.refreshName)?.value;

  if (!refresh) {
    clearSessionCookies();
    return NextResponse.json(
      {
        ok: false as const,
        code: "UNAUTHORIZED",
        message: "Missing refresh token.",
      },
      { status: 401 }
    );
  }

  try {
    // Intercambio de refresh → nuevo access (y opcional refresh)
    const tokens = await initiateAuthWithRefreshToken(refresh);

    setSessionCookies({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken ?? "",
      accessTtlSeconds: tokens.expiresInSeconds,
    });

    return NextResponse.json({ ok: true } as const, { status: 200 });
  } catch (e) {
    const err = e as ApiError;

    // Si es un error de autorización, limpiamos cookies para forzar re-login
    const isAuthError =
      err.code === "UNAUTHORIZED" ||
      err.code === "NotAuthorizedException" ||
      err.code === "FORBIDDEN";
    if (isAuthError) {
      clearSessionCookies();
    }

    const status = isAuthError
      ? 401
      : err.code === "RATE_LIMITED"
      ? 429
      : err.code === "BAD_REQUEST" || err.code === "VALIDATION_ERROR"
      ? 400
      : err.code === "NOT_FOUND"
      ? 404
      : err.code === "SERVER_ERROR"
      ? 502
      : 400;

    return NextResponse.json(
      {
        ok: false as const,
        code: err.code ?? "UNKNOWN_ERROR",
        message:
          err.message ??
          "We could not refresh the session. Please log in again.",
      },
      { status }
    );
  }
}
