import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { serverEnv, PublicEnv } from "@shared/config/env";

export const runtime = "nodejs"; // por Buffer

/**
 * Hosts a los que este proxy puede reenviar.
 *
 * Sin esta lista el endpoint aceptaba cualquier URL provista por el cliente y
 * hacía un PUT contra ella: un usuario autenticado podía usar el servidor para
 * alcanzar servicios internos (SSRF).
 */
function allowedHosts(): string[] {
  const { uploadProxy } = serverEnv();
  const hosts = new Set(uploadProxy.allowedHosts);

  // El host del backend siempre es válido: de ahí vienen las URLs prefirmadas.
  try {
    hosts.add(new URL(PublicEnv.apiBaseUrl).hostname.toLowerCase());
  } catch {
    // apiBaseUrl ya fue validada por zod; si algo falla, sólo queda la lista.
  }
  return [...hosts].filter(Boolean);
}

/** Valida el destino: sólo https/http hacia un host permitido. */
function isAllowedTarget(rawUrl: string): boolean {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return false;
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") return false;
  // Credenciales embebidas en la URL son señal de abuso.
  if (url.username || url.password) return false;

  const host = url.hostname.toLowerCase();
  return allowedHosts().some(
    (allowed) => host === allowed || host.endsWith(`.${allowed}`)
  );
}

export async function PUT(req: NextRequest) {
  const { cookies: cookieCfg } = serverEnv();
  const cookieStore = await cookies();
  const token = cookieStore.get(cookieCfg.accessName)?.value;

  if (!token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const encodedUrl = req.nextUrl.searchParams.get("url");
  if (!encodedUrl) {
    return NextResponse.json({ message: "Missing url" }, { status: 400 });
  }

  let targetUrl: string;
  try {
    targetUrl = Buffer.from(encodedUrl, "base64").toString("utf8");
  } catch {
    return NextResponse.json({ message: "Invalid url" }, { status: 400 });
  }

  if (!isAllowedTarget(targetUrl)) {
    console.warn("[api/uploads/proxy] destino rechazado");
    return NextResponse.json(
      { message: "Upload destination is not allowed" },
      { status: 400 }
    );
  }

  try {
    const contentType =
      req.headers.get("content-type") ?? "application/octet-stream";
    const body = Buffer.from(await req.arrayBuffer());

    const res = await fetch(targetUrl, {
      method: "PUT",
      body,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(body.byteLength),
      },
      cache: "no-store",
      // No seguir redirecciones: evita saltar de un host permitido a otro.
      redirect: "manual",
      signal: AbortSignal.timeout(PublicEnv.httpTimeoutMs),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("[api/uploads/proxy] storage error:", res.status, text);
      return NextResponse.json(
        { message: "Failed to upload file", details: text },
        { status: res.status }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("[api/uploads/proxy] Proxy error:", err);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
