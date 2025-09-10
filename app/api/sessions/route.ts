import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerHttp } from "@shared/api/http.server";
import { env, isProd } from "@shared/config/env";
import { cookies } from "next/headers";

const LoginSchema = z.object({
  username: z.string().min(1, "Username required"),
  password: z.string().min(1, "Password required"),
});

type LoginResponseDTO = {
  accessToken: string;
  refreshToken?: string;
  user?: unknown;
  expiresIn?: number;
  accessTokenExpiresIn?: number;
  refreshTokenExpiresIn?: number;
};

function cookieMaxAgeSec(dto: LoginResponseDTO) {
  const accessSecs = dto.accessTokenExpiresIn ?? dto.expiresIn ?? 60 * 60; // 1h default
  const refreshSecs = dto.refreshToken
    ? dto.refreshTokenExpiresIn ?? 60 * 60 * 24 * 7 // 7d default
    : undefined;
  return { accessSecs, refreshSecs };
}

function buildCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true as const,
    secure: isProd,
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
    ...(env.AUTH_COOKIE_DOMAIN ? { domain: env.AUTH_COOKIE_DOMAIN } : {}),
  };
}

/** Compatibilidad Next 14 (sync) / Next 15 (async) */
async function getCookieStore() {
  const c = cookies() as any;
  return typeof c?.then === "function" ? await c : c;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { username, password } = LoginSchema.parse(body);

  const http = createServerHttp();
  //! Ajustar ruta
  const { data } = await http.post<LoginResponseDTO>("/auth/login", {
    username,
    password,
  });

  if (!data?.accessToken) {
    return NextResponse.json(
      { message: "Invalid login response (no accessToken)" },
      { status: 502 }
    );
  }

  const { accessSecs, refreshSecs } = cookieMaxAgeSec(data);

  const res = NextResponse.json(
    { ok: true, user: data.user ?? null },
    { status: 200 }
  );

  // Set cookies httpOnly
  res.cookies.set(
    env.AUTH_ACCESS_COOKIE,
    data.accessToken,
    buildCookieOptions(accessSecs)
  );
  if (data.refreshToken) {
    res.cookies.set(
      env.AUTH_REFRESH_COOKIE,
      data.refreshToken,
      buildCookieOptions(refreshSecs!)
    );
  }

  return res;
}

/** Logout: limpia cookies httpOnly */
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  const clear = {
    httpOnly: true as const,
    secure: isProd,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 0,
    ...(env.AUTH_COOKIE_DOMAIN ? { domain: env.AUTH_COOKIE_DOMAIN } : {}),
  };
  res.cookies.set(env.AUTH_ACCESS_COOKIE, "", clear);
  res.cookies.set(env.AUTH_REFRESH_COOKIE, "", clear);
  return res;
}

/** Estado de sesión simple (opcional) */
export async function GET() {
  const store = await getCookieStore();
  const access = store.get(env.AUTH_ACCESS_COOKIE)?.value;
  return NextResponse.json({ authenticated: Boolean(access) });
}
