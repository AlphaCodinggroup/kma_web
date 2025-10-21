import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { PublicEnv, serverEnv } from "@shared/config/env";

/**
 * GET /api/flows
 * Proxy hacia `${PublicEnv.apiBaseUrl}/api/v1/flows`
 * - Inyecta Authorization: Bearer <accessToken> desde cookie httpOnly.
 * - Propaga 401/errores del upstream.
 */
export async function GET() {
  const { cookies: cookieCfg } = serverEnv();

  const cookieStore = await cookies();
  const token = cookieStore.get(cookieCfg.accessName)?.value;

  if (!token)
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const upstreamUrl = `${PublicEnv.apiBaseUrl}/api/v1/flows`;

  try {
    const res = await fetch(upstreamUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    const contentType = res.headers.get("content-type") ?? "";

    if (!res.ok) {
      if (res.status === 401) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
      }
      if (contentType.includes("application/json")) {
        const body = await res.json();
        return NextResponse.json(body, { status: res.status });
      }
      const text = await res.text();
      return NextResponse.json(
        { message: text || "Upstream error" },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    console.error("[api/flows] upstream error:", err);
    return NextResponse.json({ message: "Bad Gateway" }, { status: 502 });
  }
}
