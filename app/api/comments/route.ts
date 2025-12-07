import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { PublicEnv, serverEnv } from "@shared/config/env";

/**
 * Proxy interno para comentarios de auditoría.
 * POST /api/comments -> POST {apiBaseUrl}/comments
 * GET  /api/comments?audit_id=... -> GET {apiBaseUrl}/comments?audit_id=...
 */
export async function POST(req: NextRequest) {
  const { cookies: cookieCfg } = serverEnv();
  const cookieStore = await cookies();
  const token = cookieStore.get(cookieCfg.accessName)?.value;

  if (!token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
  }

  const upstreamUrl = `${PublicEnv.apiBaseUrl.replace(/\/$/, "")}/comments`;

  try {
    const res = await fetch(upstreamUrl, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const contentType = res.headers.get("content-type") ?? "";
    const isJson = contentType.includes("application/json");
    const responseBody = isJson
      ? await res.json().catch(() => ({}))
      : { message: await res.text() };

    return NextResponse.json(responseBody, { status: res.status });
  } catch (err) {
    console.error("[api/comments] upstream POST error:", err);
    return NextResponse.json({ message: "Bad Gateway" }, { status: 502 });
  }
}

export async function GET(req: NextRequest) {
  const { cookies: cookieCfg } = serverEnv();
  const cookieStore = await cookies();
  const token = cookieStore.get(cookieCfg.accessName)?.value;

  if (!token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const searchParams = req.nextUrl.searchParams;
  const auditId = searchParams.get("audit_id");

  if (!auditId) {
    return NextResponse.json(
      { message: "audit_id is required" },
      { status: 400 }
    );
  }

  const upstreamBase = PublicEnv.apiBaseUrl.replace(/\/$/, "");
  const upstreamUrl = new URL(`${upstreamBase}/comments`);
  upstreamUrl.searchParams.set("audit_id", auditId);

  try {
    const res = await fetch(upstreamUrl.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    const contentType = res.headers.get("content-type") ?? "";
    const isJson = contentType.includes("application/json");

    if (!res.ok) {
      const body = isJson
        ? await res.json().catch(() => ({}))
        : { message: await res.text() };
      return NextResponse.json(body, { status: res.status });
    }

    const data = isJson ? await res.json().catch(() => ({})) : {};
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error("[api/comments] upstream GET error:", err);
    return NextResponse.json({ message: "Bad Gateway" }, { status: 502 });
  }
}
