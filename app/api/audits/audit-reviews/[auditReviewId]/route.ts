import { NextRequest, NextResponse } from "next/server";
import { PublicEnv, serverEnv } from "@shared/config/env";
import { cookies } from "next/headers";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ auditReviewId: string }> }
) {
  const { auditReviewId } = await ctx.params;
  const { cookies: cookieCfg } = serverEnv();
  const cookieStore = await cookies();
  const token = cookieStore.get(cookieCfg.accessName)?.value;
  if (!token)
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const upstreamUrl = `${
    PublicEnv.apiBaseUrl
  }/audits-review/${encodeURIComponent(auditReviewId)}`;

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
    console.error("[api/audits-review] upstream error:", err);
    return NextResponse.json({ message: "Bad Gateway" }, { status: 502 });
  }
}
