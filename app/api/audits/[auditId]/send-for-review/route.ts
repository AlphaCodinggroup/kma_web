import { NextRequest, NextResponse } from "next/server";
import { PublicEnv, serverEnv } from "@shared/config/env";
import { cookies } from "next/headers";

type RouteContext = { params: Promise<{ auditId: string }> };

export async function POST(_req: NextRequest, { params }: RouteContext) {
  const { auditId } = await params;

  const { cookies: cookieCfg } = serverEnv();
  const cookieStore = await cookies();
  const token = cookieStore.get(cookieCfg.accessName)?.value;
  if (!token)
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const upstreamUrl = `${PublicEnv.apiBaseUrl.replace(
    /\/$/,
    ""
  )}/audits/${encodeURIComponent(auditId)}/send-for-review`;

  try {
    const res = await fetch(upstreamUrl, {
      method: "POST",
      headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    const contentType = res.headers.get("content-type") ?? "";
    const isJson = contentType.includes("application/json");
    const body = isJson
      ? await res.json().catch(() => ({}))
      : { message: await res.text() };

    return NextResponse.json(body, { status: res.status });
  } catch (err) {
    console.error("[api/audits] upstream error:", err);
    return NextResponse.json({ message: "Bad Gateway" }, { status: 502 });
  }
}
