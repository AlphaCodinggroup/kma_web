import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { PublicEnv, serverEnv } from "@shared/config/env";

type RouteContext = { params: Promise<{ auditId: string }> };

export async function GET(req: NextRequest, { params }: RouteContext) {
  const { auditId } = await params;

  const { cookies: cookieCfg } = serverEnv();
  const cookieStore = await cookies();
  const token = cookieStore.get(cookieCfg.accessName)?.value;

  if (!token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const baseUrl = PublicEnv.apiBaseUrl.replace(/\/$/, "");
  const upstreamUrl = new URL(
    `${baseUrl}/audits/${encodeURIComponent(auditId)}/comments`
  );

  req.nextUrl.searchParams.forEach((value, key) => {
    upstreamUrl.searchParams.set(key, value);
  });

  try {
    const res = await fetch(upstreamUrl.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json, text/plain, */*",
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
    console.error("[api/audits/:auditId/comments] upstream error:", err);
    return NextResponse.json({ message: "Bad Gateway" }, { status: 502 });
  }
}
