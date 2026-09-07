import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { PublicEnv, serverEnv } from "@shared/config/env";

/**
 * Proxy compartido del BFF hacia el backend.
 *
 * Los 31 route handlers repetían el mismo cuerpo (leer la cookie, responder
 * 401, reenviar con Bearer, reempaquetar la respuesta, 502 ante fallo de red).
 * Al copiarse a mano fue divergiendo: `facilities/[id]/restore` leía una cookie
 * llamada "token" y una variable de entorno inexistente, así que respondía 401
 * siempre.
 */

export type ProxyOptions = {
  /** Método HTTP hacia el backend. Por defecto el mismo de la petición. */
  method?: string;
  /** Ruta en el backend, sin la base. Ejemplo: "/facilities/123/restore". */
  path: string;
  /** Query params a reenviar. Se ignoran los ausentes. */
  query?: Record<string, string | number | null | undefined>;
  /** Nombres de query params de la petición original a propagar tal cual. */
  forwardQuery?: readonly string[];
  /** Cuerpo a enviar. Si se omite, se reenvía el de la petición original. */
  body?: unknown;
  /** Envía la petición sin cuerpo aunque el método lo admita. */
  omitBody?: boolean;
};

/** Respuesta 401 uniforme. */
function unauthorized() {
  return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
}

/** Lee el access token de la cookie httpOnly. */
async function readAccessToken(): Promise<string | undefined> {
  const { cookies: cookieCfg } = serverEnv();
  const jar = await cookies();
  return jar.get(cookieCfg.accessName)?.value;
}

/** Arma la URL del backend con sus query params. */
function buildUpstreamUrl(req: NextRequest, options: ProxyOptions): string {
  const base = PublicEnv.apiBaseUrl.replace(/\/$/, "");
  const path = options.path.startsWith("/") ? options.path : `/${options.path}`;
  const params = new URLSearchParams();

  for (const name of options.forwardQuery ?? []) {
    const value = req.nextUrl.searchParams.get(name);
    if (value !== null && value !== "") params.set(name, value);
  }
  for (const [name, value] of Object.entries(options.query ?? {})) {
    if (value !== null && value !== undefined && value !== "") {
      params.set(name, String(value));
    }
  }

  const qs = params.toString();
  return qs ? `${base}${path}?${qs}` : `${base}${path}`;
}

/** Reempaqueta la respuesta del backend conservando status y forma. */
async function repackage(res: Response): Promise<NextResponse> {
  const contentType = res.headers.get("content-type") ?? "";

  if (res.status === 204) {
    return new NextResponse(null, { status: 204 });
  }

  if (contentType.includes("application/json")) {
    const data = await res.json().catch(() => null);
    return NextResponse.json(data, { status: res.status });
  }

  const text = await res.text();
  if (!text) return NextResponse.json(null, { status: res.status });
  return NextResponse.json({ message: text }, { status: res.status });
}

/**
 * Reenvía la petición al backend con el token de la sesión.
 *
 * Responde 401 si no hay sesión, propaga el status del backend y devuelve 502
 * si el backend no responde.
 */
export async function proxyToBackend(
  req: NextRequest,
  options: ProxyOptions
): Promise<NextResponse> {
  const token = await readAccessToken();
  if (!token) return unauthorized();

  const method = (options.method ?? req.method ?? "GET").toUpperCase();
  const upstreamUrl = buildUpstreamUrl(req, options);

  const headers: Record<string, string> = {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };

  let body: string | undefined;
  if (!options.omitBody && method !== "GET" && method !== "HEAD") {
    if (options.body !== undefined) {
      body = JSON.stringify(options.body);
      headers["Content-Type"] = "application/json";
    } else {
      const raw = await req.text();
      if (raw) {
        body = raw;
        headers["Content-Type"] =
          req.headers.get("content-type") ?? "application/json";
      }
    }
  }

  try {
    const res = await fetch(upstreamUrl, {
      method,
      headers,
      ...(body !== undefined ? { body } : {}),
      cache: "no-store",
      signal: AbortSignal.timeout(PublicEnv.httpTimeoutMs),
    });

    if (res.status === 401) return unauthorized();
    return await repackage(res);
  } catch (err) {
    console.error(`[bff] ${method} ${options.path} upstream error:`, err);
    return NextResponse.json({ message: "Bad Gateway" }, { status: 502 });
  }
}
