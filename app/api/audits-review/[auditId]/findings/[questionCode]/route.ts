import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { PublicEnv, serverEnv } from "@shared/config/env";

type RouteContext = {
  params: Promise<{ auditId: string; questionCode: string }>;
};

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const { auditId, questionCode } = await params;

  const { cookies: cookieCfg } = serverEnv();
  const cookieStore = await cookies();
  const token = cookieStore.get(cookieCfg.accessName)?.value;
  if (!token)
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const upstreamUrl = `${PublicEnv.apiBaseUrl.replace(
    /\/$/,
    ""
  )}/audits-review/${encodeURIComponent(auditId)}/findings/${encodeURIComponent(
    questionCode
  )}`;

  let payload: unknown = {};
  try {
    payload = await req.json();
  } catch {
    payload = {};
  }

  try {
    const res = await fetch(upstreamUrl, {
      method: "PATCH",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
      body: JSON.stringify(payload),
    });

    const contentType = res.headers.get("content-type") ?? "";
    const isJson = contentType.includes("application/json");
    const body = isJson
      ? await res.json().catch(() => ({}))
      : { message: await res.text() };

    return NextResponse.json(body, { status: res.status });
  } catch (err) {
    console.error("[api/audits-review/findings] upstream error:", err);
    return NextResponse.json({ message: "Bad Gateway" }, { status: 502 });
  }
}
