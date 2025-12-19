import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { PublicEnv, serverEnv } from "@shared/config/env";

export async function GET(request: Request) {
  const { cookies: cookieCfg } = serverEnv();

  const cookieStore = await cookies();
  const token = cookieStore.get(cookieCfg.accessName)?.value;

  if (!token)
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  // Extract query parameters from request URL
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const auditor = searchParams.get("auditor");
  const limit = searchParams.get("limit");
  const last_eval_id = searchParams.get("last_eval_id");

  // Build upstream URL with query parameters
  const upstreamParams = new URLSearchParams();
  if (status) upstreamParams.set("status", status);
  if (auditor) upstreamParams.set("auditor", auditor);
  if (limit) upstreamParams.set("limit", limit);
  if (last_eval_id) upstreamParams.set("last_eval_id", last_eval_id);

  const upstreamUrl = upstreamParams.toString()
    ? `${PublicEnv.apiBaseUrl}/audits?${upstreamParams.toString()}`
    : `${PublicEnv.apiBaseUrl}/audits`;

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
    console.error("[api/audits] upstream error:", err);
    return NextResponse.json({ message: "Bad Gateway" }, { status: 502 });
  }
}
