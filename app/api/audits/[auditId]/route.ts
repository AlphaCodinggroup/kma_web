import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { PublicEnv, serverEnv } from "@shared/config/env";

type RouteContext = { params: Promise<{ auditId: string }> };

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { auditId } = await params;

  const { cookies: cookieCfg } = serverEnv();
  const cookieStore = await cookies();
  const token = cookieStore.get(cookieCfg.accessName)?.value;

  if (!token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const upstreamBase = PublicEnv.apiBaseUrl.replace(/\/$/, "");
  const upstreamUrl = `${upstreamBase}/audits/${encodeURIComponent(auditId)}`;

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
    const body = isJson
      ? await res.json().catch(() => ({}))
      : { message: await res.text().catch(() => "") };

    if (!res.ok) {
      return NextResponse.json(body, { status: res.status });
    }

    return NextResponse.json(body, { status: res.status });
  } catch (err) {
    console.error("[api/audits/:auditId] upstream error:", err);
    return NextResponse.json({ message: "Bad Gateway" }, { status: 502 });
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const { auditId } = await params;

  const { cookies: cookieCfg } = serverEnv();
  const cookieStore = await cookies();
  const token = cookieStore.get(cookieCfg.accessName)?.value;

  if (!token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const upstreamBase = PublicEnv.apiBaseUrl.replace(/\/$/, "");
  const upstreamUrl = `${upstreamBase}/audits/${encodeURIComponent(auditId)}`;

  try {
    const res = await fetch(upstreamUrl, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      if (res.status === 401) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
      }
      const contentType = res.headers.get("content-type") ?? "";
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

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("[api/audits/:auditId DELETE] error:", err);
    return NextResponse.json({ message: "Bad Gateway" }, { status: 502 });
  }
}

