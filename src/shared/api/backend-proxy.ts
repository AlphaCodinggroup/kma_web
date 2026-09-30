import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { PublicEnv, serverEnv } from "@shared/config/env";

/**
 * Proxy compartido del BFF hacia el backend.
 *
 * Los 30 route handlers repetían el mismo cuerpo (leer la cookie, responder
 * 401, reenviar con Bearer, reempaquetar la respuesta, 502 ante fallo de red).
 * Al copiarse a mano fue divergiendo: `facilities/[id]/restore` leía una cookie
 * llamada "token" y una variable de entorno inexistente, así que respondía 401
 * siempre; varias rutas parseaban el cuerpo dentro del `try` del upstream y
 * devolvían 502 ante un JSON inválido; otras reescribían el status de éxito.
 */

export type ProxyOptions = {
  /** Método HTTP hacia el backend. Por defecto el mismo de la petición. */
  method?: string;
  /** Ruta en el backend, sin la base. Ejemplo: "/facilities/123/restore". */
  path: string;
  /** Query params a reenviar. Se ignoran los ausentes y los vacíos. */
  query?: Record<string, string | number | null | undefined>;
  /** Nombres de query params de la petición original a propagar tal cual. */
  forwardQuery?: readonly string[];
  /** Query params enteros con su máximo permitido. 400 si no lo cumplen. */
  numericQuery?: Readonly<Record<string, number>>;
  /** Cuerpo a enviar. Si se omite, se reenvía el de la petición original. */
  body?: unknown;
  /** Envía la petición sin cuerpo aunque el método lo admita. */
  omitBody?: boolean;
  /** Exige que el cuerpo sea JSON válido: responde 400 antes de llamar. */
  expectJson?: boolean;
};

/** Respuesta 401 uniforme. */
function unauthorized() {
  return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
}

/** Respuesta 400 uniforme. */
function badRequest(message: string) {
  return NextResponse.json({ message }, { status: 400 });
}

/** Lee el access token de la cookie httpOnly. */
async function readAccessToken(): Promise<string | undefined> {
  const { cookies: cookieCfg } = serverEnv();
  const jar = await cookies();
  return jar.get(cookieCfg.accessName)?.value;
}

/** Tope por defecto de los listados paginados del backend. */
export const LIST_LIMIT_MAX = 200;

/** Un query param numérico es válido si está ausente o es un entero <= max. */
function isValidNumeric(value: string | null, max: number): boolean {
  if (value === null || value === "") return true;
  return /^\d+$/.test(value) && Number(value) <= max;
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

  const text = await res.text().catch(() => "");
  if (!text) return NextResponse.json(null, { status: res.status });
  return NextResponse.json({ message: text }, { status: res.status });
}

/**
 * Reenvía la petición al backend con el token de la sesión.
 *
 * Responde 401 si no hay sesión, 400 si el cuerpo o la query no son válidos,
 * propaga el status del backend y devuelve 502 si el backend no responde.
 */
export async function proxyToBackend(
  req: NextRequest,
  options: ProxyOptions
): Promise<NextResponse> {
  const token = await readAccessToken();
  if (!token) return unauthorized();

  for (const [name, max] of Object.entries(options.numericQuery ?? {})) {
    if (!isValidNumeric(req.nextUrl.searchParams.get(name), max)) {
      return badRequest(`Invalid ${name}`);
    }
  }

  const method = (options.method ?? req.method ?? "GET").toUpperCase();
  const upstreamUrl = buildUpstreamUrl(req, options);

  const headers: Record<string, string> = {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };

  // El cuerpo se resuelve ANTES de llamar al backend: así un JSON inválido es
  // un 400 del BFF y no un 502 disfrazado de fallo del upstream.
  let body: string | undefined;
  if (!options.omitBody && method !== "GET" && method !== "HEAD") {
    if (options.body !== undefined) {
      body = JSON.stringify(options.body);
      headers["Content-Type"] = "application/json";
    } else {
      const raw = await req.text().catch(() => "");
      if (options.expectJson) {
        try {
          JSON.parse(raw);
        } catch {
          return badRequest("Invalid JSON body");
        }
      }
      if (raw) {
        body = raw;
        headers["Content-Type"] =
          req.headers.get("content-type") ?? "application/json";
      }
    }
  } else if (options.expectJson && !options.omitBody) {
    return badRequest("Invalid JSON body");
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

/**
 * Valida un segmento de path recibido por parámetro de ruta.
 *
 * Devuelve la respuesta 400 cuando falta, y el segmento ya escapado cuando es
 * válido: sin escapar, un id con ".." o "/" alcanza otra ruta del backend.
 */
export function pathSegment(
  value: string | undefined,
  label: string
): { ok: true; value: string } | { ok: false; response: NextResponse } {
  const trimmed = (value ?? "").trim();
  if (!trimmed) {
    return { ok: false, response: badRequest(`${label} is required`) };
  }
  return { ok: true, value: encodeURIComponent(trimmed) };
}
